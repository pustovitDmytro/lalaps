/* eslint-disable no-magic-numbers */
import Git from '../repository/Git';
import * as repoRes from '../repository/results';
import * as advRes from '../advisories/results';
import templates from '../templates';
import advisories from '../advisories';
import ProgressNotifier from '../ProgressNotifier';
import * as platfRes from './results';

const CONFIGURATION_BRANCH = 'lalaps/configure';

export class BaseRepo {
    constructor(repo) {
        this.repo = repo;
    }

    async analize() {
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
                const { rules, ...config } = res.payload;
                const results = [];

                let ruleIndex = 0;

                for (const rule of rules) {
                    const innerPn = new ProgressNotifier([ 0.5, 0.95 ], pn);
                    const r = await this.runAdvisory({ ...rule, ...config });
                    const progress = innerPn.calcArray(rules.length, ruleIndex++, 1);

                    innerPn.progress(progress, `${rule.advisory} rule completed`);

                    results.push(r);
                }

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

        if (!configBranch) return new platfRes.BRANCH_NOT_FOUND(branchName);

        return this.checkMineBranch(configBranch)
            ? new platfRes.BRANCH_MINE()
            : new platfRes.BRANCH_TOUCHED();
    }

    async handleValidConfig(confRes, onboardingPR) {
        if (onboardingPR?.isOpen) {
            const pr = await this.api.autoclosePR(this.repo, onboardingPR, {
                body : await templates.addText(onboardingPR.body, 'onboarding/config_found.md')
            });

            return new platfRes.ONBOARDING_PR_CLOSED(pr);
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
        if (onboardingPR) {
            if (onboardingPR.isMerged || onboardingPR.isAutoClosed) {
                await this.safeDropBranch(this.repo, onboardingPR.branch);
            }

            if (onboardingPR.isOpen) {
                if (onboardingPR.isConflicted) {
                    await this.git.uploadDefaultConfig(CONFIGURATION_BRANCH);
                }

                return new platfRes.ONBOARDING_PR_OPEN(onboardingPR);
            }

            if (onboardingPR.isClosed && !onboardingPR.isAutoClosed) {
                return new platfRes.ONBOARDING_PR_CLOSED(onboardingPR);
            }
        }

        await this.git.uploadDefaultConfig(CONFIGURATION_BRANCH);

        const pr = await this.api.createPR(this.repo, {
            title : 'Configure Lalaps',
            body  : await templates.text('onboarding/onboarding_text.md'),
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

    async handleFixFound(advisory, config, res, { targetPr, targetBranch }) {
        const Advisory = advisory.constructor;
        const { stats } = advisory.analizeReport(res.report);
        const text = await templates.text(advisory.getPrTemplate(res), { stats });

        if (targetPr?.isOpen) {
            const prev = await templates.extract(targetPr.body, 'Lalaps.description');
            const next = await templates.extract(text, 'Lalaps.description');

            if (prev !== next) {
                const pr = await this.api.updatePR(this.repo, targetPr, { body: text });

                return new platfRes.FIX_PR_OPEN(pr);
            }

            if (config.automerge) {
                const checks = await this.api.getChecks(this.repo, targetPr);

                if (checks.every(c => c.isSucceeded)) {
                    const m = await this.api.automergePR(this.repo, targetPr);

                    return new platfRes.FIX_PR_MERGED(m);
                }
            }

            return new platfRes.FIX_PR_OPEN(targetPr);
        }

        const messsage = advisory.getCommitMessage(res);

        await this.git.uploadFiles(targetBranch, Advisory.Files, messsage);

        if (!targetPr?.isOpen) {
            const pr = await this.api.createPR(this.repo, {
                title  : messsage,
                body   : text,
                head   : targetBranch,
                base   : this.repo.branch,
                labels : config.labels
            });

            return new platfRes.FIX_PR_OPEN(pr);
        }
    }

    async runAdvisory(config) {
        const Advisory = advisories[config.advisory];
        const advisory = new Advisory({ ...config, folder: this.git.folder });
        const res = await advisory.run();
        const targetBranch = advisory.getTragetBranch(res);
        const concurentBranch = advisory.getConcurentBranch(res);

        const [ targetPr, concurentPr ] = await Promise.all([
            this.api.findPR(this.repo, targetBranch),
            this.api.findPR(this.repo, concurentBranch)
        ]);

        if (res instanceof advRes.NOT_VULNERABLE) {
            await Promise.all(
                [ targetPr, concurentPr ]
                    .filter(pr => pr?.isOpen)
                    .map(async pr => {
                        const body = await templates.addText(pr.body, 'already_fixed.md');

                        return this.api.autoclosePR(this.repo, pr, { body });
                    })
            );

            return res;
        }

        if (res instanceof advRes.PARTIAL_FIX || res instanceof advRes.FULL_FIX) {
            return this.handleFixFound(advisory, config, res, { targetPr, concurentPr, targetBranch, concurentBranch });
        }
    }
}

export class BasePlatform {
    constructor(config) {
        this.shouldAnalize = config.analize;
    }

    isRepoAnalizable() {
        return true;
    }

    static Repo = BaseRepo

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

    async analize({ filter }) {
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
