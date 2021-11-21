import execa from 'execa';
import { flatten } from 'myrmidon';
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

        return NPM.parseReport(out);
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
        return !!report.meta.vulnerabilities.total;
    }

    async compare(before, after) {
        const advisories = before.advisories.map(adv => {
            const corresponds = after.advisories.find(a => a.id === adv.id);
            const isFixed = !corresponds;

            return {
                ...adv,
                isFixed,
                rootLibraries : adv.rootLibraries.map(lib => ({
                    ...lib,
                    isFixed : !corresponds?.rootLibraries.some(l => l.name === lib.name)
                }))
            };
        });

        const report = {
            advisories,
            meta : {
                vulnerabilities : summaryStats(before.meta.vulnerabilities, after.meta.vulnerabilities),
                dependencies    : summaryStats(before.meta.dependencies, after.meta.dependencies)
            }
        };

        const isFix = !this.isVulnerable(after);
        const isPartialFix = report.meta.vulnerabilities.total.change > 0;

        return {
            isFix,
            isPartialFix,
            report
        };
    }

    static syncDashboard(vulnerabilities, { report, pr }) {
        for (const advisory of report.advisories) {
            const isFixed = pr && advisory.isFixed;

            let found = vulnerabilities.find(a => a.id === advisory.id);

            if (!found) {
                found = {
                    id                : advisory.id,
                    title             : advisory.title,
                    url               : advisory.url,
                    severity          : advisory.severity,
                    range             : advisory.range,
                    vulnerableLibrary : advisory.vulnerableLibrary,
                    rootLibraries     : advisory.rootLibraries.map(({ name }) => ({ name, prs: [] })),
                    prs               : []
                };
                vulnerabilities.push(found);
            }

            if (isFixed) found.prs.push(pr.number);
            found.rootLibraries = found.rootLibraries.map(lib => {
                const libFixed = pr && advisory.rootLibraries.find(l => l.name === lib.name)?.isFixed;
                const prs = lib.prs;

                if (libFixed) prs.push(pr.number);

                return {
                    ...lib,
                    prs
                };
            });
        }
    }

    static Files = [ 'package.json', 'package-lock.json' ]

    static templates = {
        prFix         : 'npm/full_fix.pr.md',
        prPartialFix  : 'npm/partial_fix.pr.md',
        defaultConfig : 'onboarding/npm_default_config.json',

        alreadyFixed : 'already_fixed.md',
        noFix        : 'no_fix.md',

        reportDetails : 'npm/report_details.md',
        dashboard     : 'npm/dashboard.md'
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
        if (error.exitCode === 1 && error.stderr === 'npm WARN invalid config audit-level="none"') {
            return error.stdout;
        }

        logger.error({ code: 'NPM_AUDIT_ERROR', error });

        throw error;
    }
}

function sum(array) {
    return array.reduce((prev, curr) => prev + curr, 0);
}

function summaryStats(before, after) {
    const categories = {};

    Object.keys(before.categories).forEach(category => {
        categories[category] = calcStats(
            before.categories[category],
            after.categories[category]
        );
    });

    return {
        total : calcStats(before.total, after.total),
        categories
    };
}

function calcStats(before, after) {
    const stats = {
        change : before - after,
        before,
        after
    };

    if (before) stats.rate = stats.change / stats.before;

    return stats;
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

    function searchRoots(libName) {
        const lib = report.vulnerabilities[libName];

        if (lib.isDirect) {
            return [ {
                name  : lib.name,
                range : lib.range,
                fix   : dumpFix(lib.fixAvailable)
            } ];
        }

        return flatten(lib.effects.map(innerName => searchRoots(innerName)));
    }

    Object.values(report.vulnerabilities).forEach((item) => {
        const isAdv = !!item.via[0]?.source;

        if (isAdv) {
            const advisory = item.via[0];

            const adv = {
                'id'       : `npm_${advisory.source}`,
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
                searchRoots(lib).forEach(root => {
                    if (!adv.rootLibraries.some(l => l.name === root.name)) {
                        adv.rootLibraries.push(root);
                    }
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
            'id'       : `npm_${item.id}`,
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
