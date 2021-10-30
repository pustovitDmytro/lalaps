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
    }

    static Repo = GithubRepo

    async autorize() {
        if (this.api) return;
        const [ installation ] = await this.appAPI.listInstallations();
        const { token } = await this.appAPI.createAcessToken(installation.id);

        this.api = new GithubReposAPI(token);
    }
}

export default new GithubPlatform(config.github);
