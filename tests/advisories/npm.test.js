import { assert } from 'chai';
import '../Test';
import { load } from '../utils';
import v2report from './npm-reports/v2.json';
import v1report from './npm-reports/v1.json';

const NPM = load('advisories/npm').default;

suite('Advisory: NPM');

before(async function () {});

test('parse auditReportVersion 2', async function () {
    assert.deepEqual(
        NPM.parseReport(v2report),
        {
            'advisories' : [
                { 'id': 1_006_254, 'title': 'Regular Expression Denial of Service in csv-parse', 'url': 'https://github.com/advisories/GHSA-582f-p4pg-xc74', 'severity': 'high', 'range': '<4.4.6', 'vulnerableLibrary': 'csv-parse', 'fix': '5.0.3', 'rootLibraries': [ { 'name': 'csv-parse', 'range': '<4.4.6', 'fix': '5.0.3' }, { 'name': 'csv', 'range': '0.4.2 - 4.0.0', 'fix': '6.0.4' } ] },
                { 'id': 1_005_154, 'title': 'Regular expression denial of service', 'url': 'https://github.com/advisories/GHSA-ww39-953v-wcq6', 'severity': 'high', 'range': '<5.1.2', 'vulnerableLibrary': 'glob-parent', 'fix': '7.0.0', 'rootLibraries': [ { 'name': 'glob-stream', 'range': '5.3.0 - 6.1.0', 'fix': '7.0.0' } ] },
                { 'id': 1_005_832, 'title': 'Directory Traversal in jn_jj_server', 'url': 'https://github.com/advisories/GHSA-79p8-4cwq-rhqh', 'severity': 'high', 'range': '<=0.0.8', 'vulnerableLibrary': 'jn_jj_server', 'fix': null, 'rootLibraries': [ { 'name': 'jn_jj_server', 'range': '*', 'fix': null } ] }
            ],
            'meta' : {
                'vulnerabilities' : { 'total': 5, 'categories': { 'info': 0, 'low': 0, 'moderate': 0, 'high': 5, 'critical': 0 } },
                'dependencies'    : { 'total': 50, 'categories': { 'prod': 51, 'dev': 0, 'optional': 0, 'peer': 0, 'peerOptional': 0 } }
            }
        }
    );
});

test('parse auditReportVersion 1', async function () {
    assert.deepEqual(
        NPM.parseReport(v1report),
        {
            'advisories' : [
                { 'id': 1_004_869, 'title': 'Prototype Pollution in node-jsonpointer', 'url': 'https://github.com/advisories/GHSA-282f-qqgm-c34q', 'severity': 'moderate', 'range': '<5.0.0', 'vulnerableLibrary': 'jsonpointer', 'fix': '>=5.0.0', 'rootLibraries': [ { 'name': 'danger' } ] },
                { 'id': 1_004_946, 'title': ' Inefficient Regular Expression Complexity in chalk/ansi-regex', 'url': 'https://github.com/advisories/GHSA-93q8-gq69-wqmw', 'severity': 'moderate', 'range': '>2.1.1 <5.0.1', 'vulnerableLibrary': 'ansi-regex', 'fix': '>=5.0.1', 'rootLibraries': [ { 'name': 'semantic-release' } ] }
            ],
            'meta' : {
                'vulnerabilities' : { 'total': 11, 'categories': { 'info': 0, 'low': 0, 'moderate': 11, 'high': 0, 'critical': 0 } },
                'dependencies'    : { 'total': 1590, 'categories': { 'prod': 220, 'dev': 1370, 'optional': 6 } }
            }
        }
    );
});

after(async function () {});
