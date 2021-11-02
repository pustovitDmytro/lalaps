import { assert } from 'chai';
import Test from '../Test';
import { load } from '../utils';

const factory = new Test();
const handler = load('workers/main').default;

suite('Workers: main #redis');

before(async function () {
    await factory.dropQueue();
});

test('run main handler', async function () {
    const res = await handler();

    assert.lengthOf(res, 1);
    assert.equal(res[0].platform, 'GithubPlatform');
    assert.exists(res[0].job);
    assert.include(res[0].job, 'repeat');
});

after(async function () {
    await factory.dropQueue();
});
