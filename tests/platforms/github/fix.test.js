import { assert } from 'chai';
import { github } from '../../entry';
import { mockAPI, unMockAPI } from '../../mock/GitHub';
import seedRepositories from '../../mock/seeds/repositories.json';
import Test from '../../Test';

const fullFix = seedRepositories[1];
const partFix = seedRepositories[2];
const notVuln = seedRepositories[4];

const factory = new Test();

suite('Github: npm Fix');

before(async function () {
    mockAPI();
    await factory.setTmpFolder();
    await factory.prepareRepositories([
        fullFix.repository,
        partFix.repository,
        notVuln.repository
    ]);
});

test('VALID_CONFIG + FULL_FIX #npm', async function () {
    const repo = await github.getRepo(`${fullFix.owner}/${fullFix.repository}`);
    const results = await repo.analyze();

    assert.lengthOf(results, 2);
    const [ prod, dev ] = results;

    assert.equal(prod.constructor.name, 'FIX_PR_OPEN');
    assert.include(prod.payload.body, 'This PR fixes 2 of 2 npm vulnerabilities');

    assert.equal(dev.constructor.name, 'FIX_PR_OPEN');
    assert.include(dev.payload.body, 'This PR fixes 1 of 3 npm vulnerabilities');
});

test('PARTIAL_FIX + openPr #npm', async function () {
    const repo = await github.getRepo(`${partFix.owner}/${partFix.repository}`);

    const results = await repo.analyze();

    assert.lengthOf(results, 1);
    const [ result ] = results;

    assert.equal(result.constructor.name, 'FIX_PR_OPEN');
});

test('NOT_VULNERABLE + Pr open #npm', async function () {
    const repo = await github.getRepo(`${notVuln.owner}/${notVuln.repository}`);
    const results = await repo.analyze();

    assert.lengthOf(results, 2);

    assert.equal(results[0].constructor.name, 'NOT_VULNERABLE');
    assert.equal(results[1].constructor.name, 'NOT_VULNERABLE');
});

after(async function () {
    await factory.cleanTmpFolder();
    unMockAPI();
});
