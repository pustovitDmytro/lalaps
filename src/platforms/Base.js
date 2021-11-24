/* eslint-disable no-magic-numbers */
import dayjs from 'dayjs';
import Git from '../repository/Git';
import * as repoRes from '../repository/results';
import * as advRes from '../advisories/results';
import advisories from '../advisories';
import templates from '../templates';
import ProgressNotifier from '../ProgressNotifier';
import { describeConfig } from '../repository/configUtils';
import * as platfRes from './results';

const CONFIGURATION_BRANCH = 'lalaps/configure';
const CONFIG_FILE_NAME = '.lalapsrc.json';
const VERBOSITY = 2;
const DASHBOARD_TITLE = 'Lalaps Dashboard';

export class BaseRepo {
    constructor(repo) {
        this.repo = repo;
        this.dashboard = {
            advisories : {},
            syncDate   : dayjs()
        };
    }

    async getDashboard() {
        const issues = await this.api.getMineIssues(this.repo);

        return issues.find(issue => issue.title === DASHBOARD_TITLE);
    }

    async analyze() {
        const pn = new ProgressNotifier([ 0.1, 0.9 ]);
        const repoName = this.repo.name;

        await templates.load();
        pn.progress(0.1, 'templates ready');

        this.git = new Git({
            url  : this.getGitUrl(this.repo),
            repo : this.repo
        });

        try {
            await this.git.init();
            pn.progress(0.25, `Repository ${repoName} cloned`);

            const res = await this.ensureOnboarding();

            pn.progress(0.5, `Repository ${repoName} onboarded`, res.describe);

            if (res instanceof repoRes.VALID_CONFIG) {
                const { rules, ...config } = res.config;
                const results = [];

                let ruleIndex = 0;

                for (const rule of rules) {
                    const innerPn = new ProgressNotifier([ 0.5, 0.95 ], pn);
                    const r = await this.runAdvisory({ ...rule, ...config });

                    this.syncDashboard(rule, r);
                    const progress = innerPn.calcArray(rules.length, ruleIndex++, 1);

                    innerPn.progress(progress, `${rule.advisory} rule [${rule.branch}] completed`, r.describe);

                    results.push(r);
                }

                await this.refreshDashboard();

                pn.progress(0.95, `${rules.length} rules analized`);

                await this.git.clear();
                pn.progress(0.99, `Repository ${repoName} cleanup completed`);

                return results;
            }

            await this.git.clear();
            pn.progress(0.99, `Repository ${repoName} cleanup completed`);


            return res;
        } catch (error) {
            console.error(error);
            await this.git.clear();
            delete this.git;
            throw error;
        }
    }

    async checkBranch(branchName) {
        const configBranch = await this.api.getBranch(this.repo, branchName);

        if (!configBranch) return new platfRes.BRANCH_NOT_FOUND({ name: branchName });

        return this.checkMineBranch(configBranch)
            ? new platfRes.BRANCH_MINE()
            : new platfRes.BRANCH_TOUCHED();
    }

    async handleValidConfig(confRes, onboardingPR) {
        if (onboardingPR?.isOpen) {
            const pr = await this.api.autoclosePR(this.repo, onboardingPR, {
                body : await templates.addText(onboardingPR.body, 'onboarding/config_found.md')
            });

            return new platfRes.ONBOARDING_PR_CLOSED({ pr });
        }

        return confRes;
    }

    async safeDropBranch(branchName) {
        try {
            // TODO: move to api
            await this.api.delete(`repos/${this.repo.name}/git/refs/heads/${branchName}`);
        } catch (error) {
            if (error.errorCode === 'BRANCH_NOT_EXISTS') return;
            throw error;
        }
    }

    async handleBadConfig(onboardingPR) {
        const config = await this.git.generateDefaultConfig();
        const message = 'Chore: Configure Lalaps';

        if (!config) {
            if (onboardingPR?.isOpen) {
                const pr = await this.api.autoclosePR(this.repo, onboardingPR, {
                    body : await templates.addText(onboardingPR.body, 'onboarding/no_advisory_found.md')
                });

                return new platfRes.ONBOARDING_PR_CLOSED(pr);
            }

            return new platfRes.NO_ADVISORY_FOUND();
        }

        const descriptions = await describeConfig(config);
        const body = await templates.text('onboarding/onboarding_text.md', { descriptions });

        if (onboardingPR) {
            if (onboardingPR.isMerged || onboardingPR.isAutoClosed) {
                await this.safeDropBranch(this.repo, onboardingPR.branch);
            }

            if (onboardingPR.isOpen) {
                const refreshed = await this.refreshPR(onboardingPR, {
                    body,
                    message,
                    force : onboardingPR.isConflicted,
                    files : [ CONFIG_FILE_NAME ]
                });

                return new platfRes.ONBOARDING_PR_OPEN(refreshed || onboardingPR);
            }

            if (onboardingPR.isClosed && !onboardingPR.isAutoClosed) {
                return new platfRes.ONBOARDING_PR_CLOSED(onboardingPR);
            }
        }

        await this.git.uploadFiles(CONFIGURATION_BRANCH, [ CONFIG_FILE_NAME ], message);

        const pr = await this.api.createPR(this.repo, {
            title : 'Configure Lalaps',
            body,
            head  : CONFIGURATION_BRANCH,
            base  : this.repo.branch
        });

        return new platfRes.ONBOARDING_PR_OPEN(pr);
    }

    async ensureOnboarding() {
        const onboardingPR = await this.api.findPR(this.repo, CONFIGURATION_BRANCH);
        const confRes = await this.git.checkConfig();

        if (confRes instanceof repoRes.VALID_CONFIG) return this.handleValidConfig(confRes, onboardingPR);

        if (confRes instanceof repoRes.CONFIG_NOT_FOUND || confRes instanceof repoRes.INVALID_CONFIG) {
            return this.handleBadConfig(onboardingPR);
        }
    }

    async refreshPR(openPr, { body, files, message, force }) {
        const prev = await templates.extract(openPr.body);
        const next = await templates.extract(body);

        if (force || prev !== next) {
            await this.git.uploadFiles(openPr.branch, files, message);

            return this.api.updatePR(this.repo, openPr, { body });
        }
    }

    async handleFixFound(advisory, config, res, { targetPr, targetBranch }) {
        const Advisory = advisory.constructor;
        const details = await templates.text(
            Advisory.templates.reportDetails,
            { report: res.report, level: VERBOSITY }
        );

        const body = await templates.text(
            advisory.getPrTemplate(res),
            { details }
        );
        const message = advisory.getCommitMessage(res);

        if (targetPr?.isOpen) {
            const refreshed = await this.refreshPR(targetPr, {
                body,
                message,
                files : Advisory.Files
            });

            if (refreshed) return new platfRes.FIX_PR_OPEN({ pr: refreshed, advisory: res });

            if (config.automerge) {
                const checks = await this.api.getChecks(this.repo, targetPr);

                if (checks.every(c => c.isSucceeded)) {
                    const m = await this.api.automergePR(this.repo, targetPr);

                    return new platfRes.FIX_PR_MERGED({ pr: m, advisory: res });
                }
            }

            return new platfRes.FIX_PR_OPEN({ pr: targetPr, advisory: res });
        }

        await this.git.uploadFiles(targetBranch, Advisory.Files, message);

        if (!targetPr?.isOpen) {
            const pr = await this.api.createPR(this.repo, {
                title  : message,
                body,
                head   : targetBranch,
                base   : this.repo.branch,
                labels : config.labels
            });

            return new platfRes.FIX_PR_OPEN({ pr, advisory: res });
        }
    }

    syncDashboard(config, result) {
        const Advisory = advisories[config.advisory];

        if (!this.dashboard.advisories[config.advisory]) {
            this.dashboard.advisories[config.advisory] = [];
        }

        const vulnerabilities = this.dashboard.advisories[config.advisory];

        Advisory.syncDashboard(vulnerabilities, {
            config,
            report : result.report,
            pr     : result.pr
        });
    }

    async refreshDashboard() {
        const data = {};

        for (const [ advisoryName, vulnerabilities ] of Object.entries(this.dashboard.advisories)) {
            const Advisory = advisories[advisoryName];
            const details = await Promise.all(
                vulnerabilities.map(vulnerability =>
                    templates.text(
                        Advisory.templates.dashboard,
                        { vulnerability }
                    ))
            );

            data[advisoryName] = details;
        }

        const text = await templates.text(
            'dashboard.md',
            { advisories: data }
        );

        const dashboardIssue = await this.getDashboard();

        await (
            !dashboardIssue
                ? this.api.createIssue(this.repo, {
                    title : DASHBOARD_TITLE,
                    body  : text
                })
                : this.api.updateIssue(this.repo, dashboardIssue, {
                    title : DASHBOARD_TITLE,
                    body  : text
                }));
    }

    async runAdvisory(config) {
        const Advisory = advisories[config.advisory];

        this.git.reset();
        const advisory = new Advisory({ ...config, folder: this.git.folder });
        const res = await advisory.run();

        const targetBranch = advisory.getTragetBranch(res);
        const concurentBranch = advisory.getConcurentBranch(res);

        const [ targetPr, concurentPr ] = await Promise.all([
            this.api.findPR(this.repo, targetBranch),
            this.api.findPR(this.repo, concurentBranch)
        ]);

        if (res instanceof advRes.NOT_VULNERABLE || res instanceof advRes.NO_FIX) {
            await Promise.all(
                [ targetPr, concurentPr ]
                    .filter(pr => pr?.isOpen)
                    .map(async pr => {
                        const body = await templates.addText(pr.body, advisory.getAutoCloseReason(res));

                        return this.api.autoclosePR(this.repo, pr, { body });
                    })
            );

            return res;
        }

        if (res instanceof advRes.PARTIAL_FIX || res instanceof advRes.FULL_FIX) {
            return this.handleFixFound(advisory, config, res, { targetPr, concurentPr, targetBranch, concurentBranch });
        }

        return res;
    }
}

export class EmptyPlatform {}

export class BasePlatform {
    constructor(config) {
        // eslint-disable-next-line no-constructor-return
        if (!config) return new EmptyPlatform();
        this.shouldAnalize = config.analyze;
    }

    isRepoAnalizable() {
        return true;
    }

    static Repo = BaseRepo

    async autorize() {
        return;
    }

    async getRepo(repoName) {
        const pn = new ProgressNotifier([ 0, 0.1 ]);

        await this.autorize();
        pn.progress(0.3, `platform ${this.constructor.name} authorized`);

        const repository = await this.api.getRepo(repoName);

        if (!this.isRepoAnalizable(repository)) return;
        pn.progress(0.6, `repository ${repository.name} analizable`);

        const repo = new this.constructor.Repo(repository);

        await repo.autorize(this);
        pn.progress(0.9, `repository ${repository.name} authorized`);

        return repo;
    }

    async analyze({ filter }) {
        const pn = new ProgressNotifier();

        await this.autorize();
        pn.progress(0.4, `platform ${this.constructor.name} authorized`);
        const repositories = await this.api.listRepos();

        pn.progress(0.8, `${repositories.length} repositories available`);

        const filtered = repositories.filter(repo => {
            if (filter && !filter.includes(repo.name)) return false;

            return this.isRepoAnalizable(repo);
        });

        pn.progress(0.95, `${filtered.length} repositories analizable`);

        return filtered;
    }
}
