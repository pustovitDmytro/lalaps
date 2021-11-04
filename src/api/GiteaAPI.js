/* jscpd:ignore-start */

import BaseAPI from 'base-api-client';

export default class GiteaAPI extends BaseAPI {
    constructor(url, token) {
        super(url);
        this.token = token;
    }

    getHeaders() {
        return {
            Authorization : `token ${this.token}`,
            Accept        : 'application/vnd.github.v3+json'
        };
    }

    async getRepo(repoName) {
        const res = await this.get(`/repos/${repoName}`);

        return dumpRepository(res);
    }

    async findPR(repo, head) {
        const list = await this.get(`/repos/${repo.name}/pulls`, {
            head  : `${repo.owner.login}:${head}`,
            state : 'all'
        });

        if (list.length === 0) return null;

        const res = await this.get(`/repos/${repo.name}/pulls/${list[0].number}`);

        return dumpPR(res);
    }

    async createPR(repo, { title, body, head, base }) {
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

        // TODO: labels

        await Promise.all(promises);

        return dumpPR(res);
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
            isArchived : r.archived
        },

        owner : dumpUser(r.owner)
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

/* jscpd:ignore-end */
