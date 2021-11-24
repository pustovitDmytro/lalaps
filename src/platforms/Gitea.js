import API from '../api/GiteaAPI';
import config from '../config';
import { BasePlatform, BaseRepo } from './Base';

export class GiteaRepo extends BaseRepo {
    constructor(repo) {
        super(repo);
    }

    autorize(platform) {
        this.api = platform.api;
    }

    getGitUrl() {
        return `http://${this.api.token}:x-oauth-basic@${this.api.url.host}/${this.repo.name}.git`;
    }

    checkMineBranch(branch) {
        return branch.commitAuthor.id === this.userId;
    }
}


export class GiteaPlatform extends BasePlatform {
    constructor(conf) {
        super(conf);
        if (!conf) return;
        this.api = new API(conf.url, conf.token);
    }

    static Repo = GiteaRepo
}

export default new GiteaPlatform(config.gitea);
