import { assert } from 'chai';
import { gitea } from '../../entry';
import { mockAPI, unMockAPI } from '../../mock/Gitea';
import seedRepositories from '../../mock/seeds/repositories.json';
import Test from '../../Test';

const [ noConf ] = seedRepositories;

const factory = new Test();

suite('Gitea: Onboarding');

before(async function () {
    mockAPI();
    await factory.setTmpFolder();
    await factory.prepareRepositories([ noConf.repository ]);
});

test('Repo without config', async function () {
    const repo = await gitea.getRepo(`${noConf.owner}/${noConf.repository}`);
    const result = await repo.analize();

    assert.equal(result.constructor.name, 'ONBOARDING_PR_OPEN');
});

after(function () {
    unMockAPI();
});
