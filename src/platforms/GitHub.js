import GithubAppAPI from '../api/GithubAppAPI';
import GithubReposAPI from '../api/GithubReposAPI';
import config from '../config';
import { BasePlatform, BaseRepo } from './Base';

export class GithubRepo extends BaseRepo {
    constructor(repo) {
        super(repo);
    }

    autorize(platform) {
        this.api = platform.api;
    }

    getGitUrl() {
        return `https://x-access-token:${this.api.token}@github.com/${this.repo.name}.git`;
    }

    checkMineBranch(branch) {
        return branch.commitAuthor.id === this.userId;
    }
}


export class GithubPlatform extends BasePlatform {
    constructor(conf) {
        super(conf);
        this.appAPI = new GithubAppAPI(conf.app);
        this.userId = conf.userId;
        this.userName = conf.userName;
    }

    static Repo = GithubRepo

    async autorize() {
        const isRefreshed = this.appAPI.refreshToken();

        if (this.api && !isRefreshed) return;
        const [ installation ] = await this.appAPI.listInstallations();
        const { token } = await this.appAPI.createAcessToken(installation.id);

        this.api = new GithubReposAPI(token, {
            userId   : this.userId,
            userName : this.userName
        });
    }

    isRepoAnalizable(repo) {
        const props = repo.properties;

        return !props.isPrivate
        && !props.isFork
        && !props.isArchived
        && !props.isDisabled;
    }
}

export default new GithubPlatform(config.github);
