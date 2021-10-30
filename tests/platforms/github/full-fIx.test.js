/* eslint-disable unicorn/filename-case */
import { assert } from 'chai';
import { github } from '../../entry';
import { mockAPI, unMockAPI } from '../../mock/GitHub';
import seedRepositories from '../../mock/seeds/repositories.json';
import Test from '../../Test';

const validConf = seedRepositories[1];

const factory = new Test();

suite('Github: Full Fix');

before(async function () {
    mockAPI();
    await factory.setTmpFolder();
    await factory.prepareRepositories([ validConf.repository ]);
});

test('VALID_CONFIG + FULL_FIX', async function () {
    const repo = await github.getRepo(`${validConf.owner}/${validConf.repository}`);
    const results = await repo.analize();

    assert.lengthOf(results, 1);
    const [ result ] = results;

    assert.equal(result.constructor.name, 'FIX_PR_OPEN');
});

after(async function () {
    await factory.cleanTmpFolder();
    unMockAPI();
});
