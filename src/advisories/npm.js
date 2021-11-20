import execa from 'execa';
import logger from '../logger';
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
        defaultConfig : 'onboarding/npm_default_config.json',

        alreadyFixed : 'already_fixed.md',
        noFix        : 'no_fix.md'
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

    static parseReport(report) {
        const v2 = 2;

        if (report.auditReportVersion === v2) return parseAuditReportV2(report);

        return parseLegacyReport(report);
    }
}

async function executeAuditCommand({
    force,
    cwd,
    fix,
    json = true,
    production
}) {
    const params = [ '--audit-level=none' ];

    if (fix) params.push('fix');
    if (json) params.push('--json');
    if (force) params.push('--force');
    if (production) params.push('--only=prod');

    try {
        logger.verbose({ command: 'npm audit', params });
        const res = await execa('npm', [ 'audit', ...params ], {
            cwd,
            extendEnv : false,
            env       : { PATH: process.env.PATH }
        });

        return res.stdout;
    } catch (error) {
        logger.error({ code: 'NPM_AUDIT_ERROR', error });
        throw error;
    }
}

function sum(array) {
    return array.reduce((prev, curr) => prev + curr, 0);
}

function summarize(obj) {
    const { total, ...categories } = obj;

    return {
        total : total || sum(Object.values(categories)),
        categories
    };
}

function dumpFix(fixAvailable) {
    if (!fixAvailable) return null;

    return fixAvailable.version;
}

function parseAuditReportV2(report) {
    const advisories = [];

    Object.values(report.vulnerabilities).forEach((item) => {
        const isAdv = !!item.via[0]?.source;

        if (isAdv) {
            const advisory = item.via[0];

            const adv = {
                'id'       : advisory.source,
                'title'    : advisory.title,
                'url'      : advisory.url,
                'severity' : advisory.severity,
                'range'    : advisory.range,

                'vulnerableLibrary' : advisory.name,
                'fix'               : dumpFix(item.fixAvailable),
                'rootLibraries'     : []
            };

            if (item.isDirect) {
                adv.rootLibraries.push({
                    name  : item.name,
                    range : item.range,
                    fix   : dumpFix(item.fixAvailable)
                });
            }

            item.effects.forEach(lib => {
                const effect = report.vulnerabilities[lib];

                adv.rootLibraries.push({
                    name  : effect.name,
                    range : effect.range,
                    fix   : dumpFix(effect.fixAvailable)
                });
            });

            advisories.push(adv);
        }
    });

    const { vulnerabilities, dependencies } = report.metadata;

    return {
        advisories,
        meta : {
            vulnerabilities : summarize(vulnerabilities),
            dependencies    : summarize(dependencies)
        }
    };
}

function parseLegacyReport(report) {
    const advisories = [];

    Object.values(report.advisories).forEach(item => {
        const rootLibraries = new Set();

        item.findings.forEach(f => {
            for (const path of f.paths) {
                rootLibraries.add(path.split('>')[0]);
            }
        });

        advisories.push({
            'id'       : item.id,
            'title'    : item.title,
            'url'      : item.url,
            'severity' : item.severity,
            'range'    : item.vulnerable_versions,

            'vulnerableLibrary' : item.module_name,
            'fix'               : item.patched_versions,
            'rootLibraries'     : [ ...rootLibraries ].map(
                name => ({ name })
            )
        });
    });

    return {
        advisories,
        meta : {
            vulnerabilities : summarize(report.metadata.vulnerabilities),
            dependencies    : {
                'total'      : report.metadata.totalDependencies,
                'categories' : {
                    'prod'     : report.metadata.dependencies,
                    'dev'      : report.metadata.devDependencies,
                    'optional' : report.metadata.optionalDependencies
                }
            }
        }
    };
}
