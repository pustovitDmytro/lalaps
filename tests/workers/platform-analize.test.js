import { assert } from 'chai';
import Test from '../Test';
import { load, ensureError } from '../utils';
import { mockAPI, unMockAPI } from '../mock/GitHub';
import { Job } from '../mock/Job';
import seedRepositories from '../mock/seeds/repositories.json';

const factory = new Test();
const handler = load('workers/platform-analize.js').default;

suite('Workers: platform-analize #redis');

before(async function () {
    mockAPI();
    await factory.dropQueue();
});

test('Negative: invalid platformName', async function () {
    const data = { platformName: 'Lora Pope' };
    const error = await ensureError(() => handler({ data }));

    assert.equal(error.message, 'platform \'Lora Pope\' not found');
});

test('iterate GithubPlatform', async function () {
    const data = { platformName: 'GithubPlatform' };

    const job = new Job(data);
    const res = await handler(job);

    assert.deepEqual(
        res,
        seedRepositories.map(r => `${r.owner}/${r.repository}`)
    );
});


after(async function () {
    await factory.dropQueue();
    unMockAPI();
});
