import { assert } from 'chai';
import Test from '../Test';
import request from '../request';

const factory = new Test();

suite('Verification Files #web');

before(async function () {
    await factory.dropQueue();
});

test('Positive: verify.txt', async function () {
    await request
        .get('/_verify.txt')
        .expect(200)
        // .expect('Content-Type', 'application/json; charset=utf-8')
        .expect((res) => {
            assert.equal(res.text, 'AAA_DOMAIN_VERIFICATION_FILE');
        });
});

after(async function () {
    await factory.dropQueue();
});
