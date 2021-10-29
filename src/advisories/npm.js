import execa from 'execa';
import Advisory from './Base';

export default class NPM extends Advisory {
    async check() {
        const stdout = await executeAuditCommand({
            cwd : this._folder
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
            force : true,
            fix   : true,
            cwd   : this._folder
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

    static branches = {
        fix        : 'npm-fix',
        partialFix : 'npm-partial-fix'
    }

    static templates = {
        prFix        : 'npm/full_fix.pr.md',
        prPartialFix : 'npm/partial_fix.pr.md'
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
}

async function executeAuditCommand({ force, cwd, fix, json = true }) {
    const params = [ ];

    if (fix) params.push('fix');
    if (json) params.push('--json');
    if (force) params.push('--force');
    try {
        const res = await execa('npm', [ 'audit', ...params ], { cwd });

        return res.stdout;
    } catch (error) { // TODO: properly handle error signals
        return error.stdout;
    }
}

function sum(array) {
    return array.reduce((prev, curr) => prev + curr, 0);
}
