/* jscpd:ignore-start */
import BaseAPI, { API_ERROR } from 'base-api-client';

class GITHUB_ERROR extends API_ERROR {
    static get MESSAGES() {
        return {
            'Reference does not exist' : 'BRANCH_NOT_EXISTS'
        };
    }

    get errorCode() {
        const inner  = this.payload.response?.data;

        if (inner) return GITHUB_ERROR.MESSAGES[inner.message];

        return 'UNKNOWN_GITHUB_ERROR';
    }
}

export default class GithubReposAPI extends BaseAPI {
    constructor(token, { userId, userName }) {
        super('https://api.github.com/');
        this.token = token;
        this.userId = userId;
        this.userName = userName;
    }

    onError(error) {
        if (error.isAxiosError) throw new GITHUB_ERROR(error);
        throw error;
    }

    getHeaders() {
        return {
            Authorization : `token ${this.token}`,
            Accept        : 'application/vnd.github.v3+json'
        };
    }

    async listRepos({ perPage = 50, page = 1 } = {}) {
        const res = await this.get('/installation/repositories', {
            'per_page' : perPage,
            page
        });

        const repositories = res.repositories.map(r => dumpRepository(r));

        if (repositories.length === perPage) {
            const pagginated = await this.listRepos({
                perPage,
                page : page + 1
            });

            return [ ...repositories, ...pagginated ];
        }

        return repositories;
    }

    async getRepo(repoName) {
        const res = await this.get(`/repos/${repoName}`);

        return dumpRepository(res);
    }

    async listPRs(repo, { perPage = 50, page = 1 } = {}) {
        const res = await this.get(`/repos/${repo.name}/pulls`, {
            'per_page' : perPage,
            page
        });

        const repositories = res.map(r => dumpPR(r));

        if (repositories.length === perPage) {
            const pagginated = await this.listPRs({
                perPage,
                page : page + 1
            });

            return [ ...repositories, ...pagginated ];
        }

        return repositories;
    }

    async findPR(repo, head) {
        const list = await this.get(`/repos/${repo.name}/pulls`, {
            head  : `${repo.owner.login}:${head}`,
            state : 'all'
        });

        const mine = list.filter(pr => pr.user.id === this.userId);

        if (mine.length === 0) return null;

        const res = await this.get(`/repos/${repo.name}/pulls/${mine[0].number}`);

        return dumpPR(res);
    }

    async createPR(repo, { title, body, head, base, labels }) {
        const res = await this.post(`/repos/${repo.name}/pulls`, {
            'maintainer_can_modify' : false,
            title,
            body,
            head,
            base
        });

        const promises = [
            this.post(
                `/repos/${repo.name}/issues/${res.number}/assignees`,
                { assignees: [ repo.owner.login ] }
            )
        ];

        if (labels) {
            promises.push(this.post(`/repos/${repo.name}/issues/${res.number}/labels`, { labels }));
        }

        await Promise.all(promises);

        return dumpPR(res);
    }

    async autoclosePR(repo, pr, { title, body }) {
        const updated = await this.updatePR(repo, pr, {
            title : title || `${pr.title} - autoclosed`,
            body  : body || pr.body,
            state : 'closed'
        });

        await this.delete(`repos/${repo.name}/git/refs/heads/${  updated.branch}`);

        return updated;
    }

    async automergePR(repo, pr) {
        const res = await this.put(`/repos/${repo.name}/pulls/${pr.number}/merge`, {
            'merge_method' : 'squash'
        });

        await this.delete(`repos/${repo.name}/git/refs/heads/${pr.branch}`);

        return dumpMerge(res);
    }

    async getChecks(repo, pr) {
        const res = await this.get(`/repos/${repo.name}/commits/${pr.branch}/check-runs`);

        return res.check_runs.map(run => dumpCheck(run));
    }

    async updatePR(repo, pr, { title, body, state }) {
        const res = await this.patch(`/repos/${repo.name}/pulls/${pr.number}`, {
            title,
            body,
            state
        });

        return dumpPR(res);
    }

    async getBranch(repo, name) {
        const res = await this.get(`/repos/${repo.name}/branches/${name}`);

        return dumpBranch(res);
    }

    async getMineIssues(repo) {
        const res = await this.get(`/repos/${repo.name}/issues`, {
            creator : this.userName
        });

        return res.map(issue => dumpIssue(issue));
    }

    async createIssue(repo, { title, body }) {
        const res = await this.post(`/repos/${repo.name}/issues`, {
            title,
            body
        });

        return dumpIssue(res);
    }

    async updateIssue(repo, issue, { title, body }) {
        const res = await this.patch(
            `/repos/${repo.name}/issues/${issue.number}`,
            {
                title,
                body
            }
        );

        return dumpIssue(res);
    }
}

function dumpUser(u) {
    return {
        login : u.login,
        id    : u.id
    };
}

function dumpRepository(r) {
    return {
        id   : r.id,
        name : r.full_name,
        size : r.size,

        branch      : r.default_branch,
        permissions : r.permissions,

        properties : {
            isPrivate  : r.private,
            isFork     : r.fork,
            isArchived : r.archived,
            isDisabled : r.disabled
        },

        owner : dumpUser(r.owner)
    };
}

function dumpMerge(p) {
    return {
        'sha'     : p.sha,
        'merged'  : p.merged,
        'message' : p.message
    };
}

function dumpPR(p) {
    const isMerged = p.merged;
    const isClosed = !isMerged && p.state === 'closed';

    return {
        id           : p.id,
        number       : p.number,
        user         : dumpUser(p.user),
        title        : p.title,
        body         : p.body,
        branch       : p.head.ref,
        isConflicted : p.mergeable_state === 'dirty',
        isMerged,
        isOpen       : p.state === 'open',
        isClosed,
        isAutoClosed : isClosed && p.title.includes('- autoclosed')
    };
}

function dumpBranch(b) {
    return {
        name         : b.name,
        commitSHA    : b.commit.sha,
        commitAuthor : dumpUser(b.commit.author)
    };
}

function dumpCheck(c) {
    return {
        id          : c.id,
        name        : c.name,
        isSucceeded : c.status === 'completed' && c.conclusion === 'success'
    };
}

function dumpIssue(i) {
    return {
        id     : i.id,
        number : i.number,
        title  : i.title,

        user : dumpUser(i.user),
        body : i.body
    };
}

/* jscpd:ignore-end */
