import execa from 'execa';
import Advisory from './Base';

export default class NPM extends Advisory {
    constructor(conf) {
        super(conf);
        this._force = conf.force;
        this._production = conf.production;
    }

    async check() {
        const stdout = await executeAuditCommand({
            cwd        : this._folder,
            production : this._production
        });

        const out = JSON.parse(stdout);
        const { vulnerabilities } = out.metadata;

        if (vulnerabilities.total !== 0 && !vulnerabilities.total) {
            vulnerabilities.total = sum(Object.values(vulnerabilities));
        }

        // { info: 0, low: 0, moderate: 3, high: 11, critical: 0, total: 14 }

        return vulnerabilities;
    }

    async fix() {
        await executeAuditCommand({
            force      : this._force,
            production : this._production,
            fix        : true,
            cwd        : this._folder
        });
    }

    isVulnerable(report) {
        return !!report.total;
    }

    async compare(before, after) {
        const totalFixedCount = before.total - after.total;
        const isFix = !this.isVulnerable(after);

        const isPartialFix = totalFixedCount > 0;
        const report = [ {
            type   : 'total',
            before : before.total,
            after  : after.total
        } ];

        return {
            isFix,
            isPartialFix,
            report
        };
    }

    static Files = [ 'package.json', 'package-lock.json' ]

    static templates = {
        prFix         : 'npm/full_fix.pr.md',
        prPartialFix  : 'npm/partial_fix.pr.md',
        defaultConfig : 'onboarding/npm_default_config.json'
    }

    analizeReport(reports) {
        const [ total ] = reports;
        const stats = {
            fixed  : total.before - total.after,
            before : total.before,
            after  : total.after
        };

        stats.rate = stats.fixed / stats.before;

        return { stats };
    }

    get describe() {
        const messages = [ 'Vulnerabilities will be fixed using npm-audit command' ];

        if (this._force) messages.push('--force: Removes various protections against unfortunate side effects, common mistakes, unnecessary performance degradation, and malicious input.\nNote: it is strongly recommended that you do not use this option with automerge');

        if (this._production) messages.push('--production: Only production dependencies will be checked');

        return [ ...super.describe, ...messages ];
    }
}

async function executeAuditCommand({
    force,
    cwd,
    fix,
    json = true,
    production
}) {
    const params = [ ];

    if (fix) params.push('fix');
    if (json) params.push('--json');
    if (force) params.push('--force');
    if (production) params.push('--only=prod');

    try {
        // console.log('npm audit', params.join(' '));
        const res = await execa('npm', [ 'audit', ...params ], { cwd });

        return res.stdout;
    } catch (error) { // TODO: properly handle error signals
        return error.stdout;
    }
}

function sum(array) {
    return array.reduce((prev, curr) => prev + curr, 0);
}
