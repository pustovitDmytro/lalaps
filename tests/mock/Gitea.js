import path from 'path';
import { load } from '../utils';
import { tmpReposDir } from '../constants';
import seedRepositories from './seeds/repositories.json';
import {
    setup,
    runMock, runUnmock,
    axiosResponse,
    getTestTraceId, trackLogger
} from './utils';

function repoResponse(repo, index) {
    return {
        'full_name'      : `${repo.owner}/${repo.repository}`,
        'id'             : index,
        'default_branch' : 'master',
        'size'           : 28,
        'permissions'    : {},

        'private'  : false,
        'fork'     : false,
        'archived' : false,
        'disabled' : false,

        'owner' : { login: repo.owner, id: index }
    };
}

function pullResponse(repo, index) {
    return {
        id     : 89,
        number : index,
        user   : { login: repo.owner, id: index },
        title  : 'tie corn political she favorite bring',
        body   : 'base seat scale even came giant skin old right swung lucky quite unit pour outer enjoy send shinning',
        head   : {
            ref : ''
        },
        'mergeable_state' : 'clean',
        state             : 'open'
    };
}

const GiteaAPI = load('api/GiteaAPI.js').default;
const { GiteaRepo } = load('platforms/Gitea.js');

class MockGiteaRepo extends GiteaRepo {
    getGitUrl() {
        const repo = seedRepositories[this.repo.id];
        const repoPath = path.join(tmpReposDir, repo.repository);

        return `file://${repoPath}`;
    }
}

class MockGiteaAPI extends GiteaAPI {
    async _axios(opts) {
        if (opts.url.match('/repos')) {
            const repoIndex = seedRepositories.findIndex(r => opts.url.includes(`/repos/${r.owner}/${r.repository}`));

            if (~repoIndex) {
                const repo = seedRepositories[repoIndex];

                if (opts.method === 'GET' && opts.url.endsWith(`/repos/${repo.owner}/${repo.repository}`)) {
                    return axiosResponse(repoResponse(repo, repoIndex));
                }

                if (opts.method === 'GET' && opts.url.endsWith(`/repos/${repo.owner}/${repo.repository}/pulls`)) {
                    return axiosResponse([]);
                }

                if (opts.method === 'POST' && opts.url.endsWith(`/repos/${repo.owner}/${repo.repository}/pulls`)) {
                    return axiosResponse(pullResponse(repo, repoIndex));
                }
            }
        }


        return axiosResponse();
    }

    log() {
        trackLogger.log(...arguments);
    }

    getTraceId() {
        return getTestTraceId();
    }
}

const CLIENTS = [
    { from: GiteaAPI, to: MockGiteaAPI },
    { from: GiteaRepo, to: MockGiteaRepo }
];

setup(CLIENTS);

export function mockAPI() {
    runMock(CLIENTS);
}

export function unMockAPI() {
    runUnmock(CLIENTS);
}

