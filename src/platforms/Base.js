import Git from '../repository/Git';
import * as repoRes from '../repository/results';
import * as advRes from '../advisories/results';
import templates from '../templates';
import advisories from '../advisories';
import * as platfRes from './results';

const CONFIGURATION_BRANCH = 'lalaps/configure';

export class BaseRepo {
    constructor(repo) {
        this.repo = repo;
    }

    async analize() {
        this.git = new Git({
            tmpFolder : './tmp',
            url       : this.getGitUrl(this.repo),
            repo      : this.repo
        });

        try {
            await this.git.init();
            const res = await this.ensureOnboarding();

            if (res instanceof repoRes.VALID_CONFIG) {
                const { rules, ...config } = res.payload;
                const results = [];

                for (const rule of rules) {
                    const r = await this.runAdvisory({ ...rule, ...config });

                    results.push(r);
                }

                await this.git.clear();

                return results;
            }

            await this.git.clear();

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
                body : await templates.addText(onboardingPR.body, 'config_found.md')
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

    async runAdvisory(config) {
        const Advisory = advisories[config.advisory];
        const advisory = new Advisory({ ...config, folder: this.git.folder });
        const res = await advisory.run();

        if (res instanceof advRes.PARTIAL_FIX || res instanceof advRes.FULL_FIX) {
            const targetBranch = advisory.getTragetBranch(res);
            const concurentBranch = advisory.getConcurentBranch(res);

            const [ targetPr, concurentPr ] = await Promise.all([
                this.api.findPR(this.repo, targetBranch),
                this.api.findPR(this.repo, concurentBranch)
            ]);

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

        return res;
    }
}

export class BasePlatform {
    isRepoAnalizable() {
        return true;
    }

    static Repo = BaseRepo

    async getRepo(repoName) {
        await templates.load();

        await this.autorize();
        const repository = await this.api.getRepo(repoName);

        if (!this.isRepoAnalizable(repository)) return;

        const repo = new this.constructor.Repo(repository);

        await repo.autorize(this);

        return repo;
    }

    async analize({ filter }) {
        await this.autorize();
        const repositories = await this.api.listRepos();
        const allowedRepos = repositories.filter(repo => {
            if (filter && !filter.includes(repo.name)) return false;

            return this.isRepoAnalizable(repo);
        });

        allowedRepos.forEach(repo => {
            console.log(repo); // TODO: queue
        });
    }
}
