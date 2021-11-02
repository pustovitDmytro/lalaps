import { assert } from 'chai';
import Test from '../Test';
import { load, ensureError } from '../utils';
import { mockAPI, unMockAPI } from '../mock/GitHub';
import { Job } from '../mock/Job';
import seedRepositories from '../mock/seeds/repositories.json';

const repo = seedRepositories[0];
const factory = new Test();
const handler = load('workers/repo-analize.js').default;

suite('Workers: repo-analize #redis');

before(async function () {
    mockAPI();
    await factory.dropQueue();
    await factory.setTmpFolder();
    await factory.prepareRepositories([
        repo.repository
    ]);
});

test('Negative: invalid platformName', async function () {
    const data = { platformName: 'Lora Pope' };
    const error = await ensureError(() => handler({ data }));

    assert.equal(error.message, 'platform \'Lora Pope\' not found');
});

test('run on github repo', async function () {
    const data = {
        platformName : 'GithubPlatform',
        repo         : { name: `${repo.owner}/${repo.repository}` }
    };

    const job = new Job(data);

    await handler(job);
});


after(async function () {
    await factory.dropQueue();
    unMockAPI();
    await factory.cleanTmpFolder();
});
