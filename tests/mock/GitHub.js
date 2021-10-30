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
        'size'           : 18,
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
        id     : 99,
        number : index,
        user   : { login: repo.owner, id: index },
        title  : 'sell shape protection stared shown',
        body   : 'vegetable mark subject paid organized paragraph give earth beautiful bent feet climate die salt built tobacco lovely middle border',
        head   : {
            ref : ''
        },
        'mergeable_state' : 'clean',
        state             : 'open'
    };
}

const GithubReposAPI = load('api/GithubReposAPI.js').default;
const GithubAppAPI = load('api/GithubAppAPI.js').default;
const { GithubRepo } = load('platforms/GitHub.js');

class MockGithubRepo extends GithubRepo {
    getGitUrl() {
        const repo = seedRepositories[this.repo.id];
        const repoPath = path.join(tmpReposDir, repo.repository);

        return `file://${repoPath}`;
    }
}

class MockGithubAppAPI extends GithubAppAPI {
    async _axios(opts) {
        if (opts.method === 'GET' && opts.url.match('/installations')) {
            return axiosResponse([ { id: 1 } ]);
        }

        if (opts.method === 'POST' && opts.url.match('/installations/1/access_tokens')) {
            return axiosResponse({ token: 'MOCK_TOKEN' });
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

class MockGithubReposAPI extends GithubReposAPI {
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
    { from: GithubAppAPI, to: MockGithubAppAPI },
    { from: GithubReposAPI, to: MockGithubReposAPI },
    { from: GithubRepo, to: MockGithubRepo }
];

setup(CLIENTS);

export function mockAPI() {
    runMock(CLIENTS);
}

export function unMockAPI() {
    runUnmock(CLIENTS);
}

