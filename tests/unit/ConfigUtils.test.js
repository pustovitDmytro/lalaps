import { assert } from 'chai';
import '../Test';
import { load } from '../utils';


const { describeConfig } = load('repository/configUtils.js');
const defaultConfig = load('../templates/onboarding/default_config.json');
const npmConfig = load('../templates/onboarding/npm_default_config.json');

suite('Unit: ConfigUtils');

before(async function () {});

test('describe advanced config', async function () {
    const rules = await describeConfig({
        'branchPrefix'            : 'lalaps',
        'labels'                  : [ 'dependencies', 'security' ],
        'commitMessageFix'        : 'Chore: fixes npm audit vulnerabilities',
        'commitMessagePartialFix' : 'Chore: fixes some npm audit vulnerabilities',
        'rules'                   : [
            {
                'advisory'                : 'npm',
                'automerge'               : true,
                'commitMessageFix'        : 'Fix: fixes npm audit vulnerabilities',
                'commitMessagePartialFix' : 'Fix: fixes some npm audit vulnerabilities',
                'production'              : true,
                'branch'                  : 'npm-production'
            },
            {
                'advisory'  : 'npm',
                'automerge' : true,
                'branch'    : 'npm'
            },
            {
                'advisory' : 'npm',
                'force'    : true,
                'branch'   : 'npm-force'
            }
        ]
    });

    assert.lengthOf(rules, 3);
    const [ production, npm, force ] = rules;

    assert.deepEqual(production, {
        type        : 'npm',
        description : [
            'Full fix will be pushed to "lalaps/npm-production/fix" branch with commit message "Fix: fixes npm audit vulnerabilities"',
            'Partial fix will be pushed to "lalaps/npm-production/partial-fix" with commit message "Fix: fixes some npm audit vulnerabilities"',
            'Vulnerabilities will be fixed using npm-audit command',
            '--production: Only production dependencies will be checked',
            '[dependencies, security] labels will be added to pull requests',
            'Fixes will be automerged on next run'
        ]
    });

    assert.deepEqual(npm, {
        type        : 'npm',
        description : [
            'Full fix will be pushed to "lalaps/npm/fix" branch with commit message "Chore: fixes npm audit vulnerabilities"',
            'Partial fix will be pushed to "lalaps/npm/partial-fix" with commit message "Chore: fixes some npm audit vulnerabilities"',
            'Vulnerabilities will be fixed using npm-audit command',
            '[dependencies, security] labels will be added to pull requests',
            'Fixes will be automerged on next run'
        ]
    });

    assert.deepEqual(force, {
        type        : 'npm',
        description : [
            'Full fix will be pushed to "lalaps/npm-force/fix" branch with commit message "Chore: fixes npm audit vulnerabilities"',
            'Partial fix will be pushed to "lalaps/npm-force/partial-fix" with commit message "Chore: fixes some npm audit vulnerabilities"',
            'Vulnerabilities will be fixed using npm-audit command',
            '--force: Removes various protections against unfortunate side effects, common mistakes, unnecessary performance degradation, and malicious input.\nNote: it is strongly recommended that you do not use this option with automerge',
            '[dependencies, security] labels will be added to pull requests'
        ]
    });
});

test('describe default npm config', async function () {
    const rules = await describeConfig({ ...defaultConfig, rules: npmConfig });

    assert.lengthOf(rules, 1);
    const [ npm ] = rules;

    assert.deepEqual(npm, {
        type        : 'npm',
        description : [
            'Full fix will be pushed to "lalaps/npm/fix" branch with commit message "Chore: fixes npm audit vulnerabilities"',
            'Partial fix will be pushed to "lalaps/npm/partial-fix" with commit message "Chore: fixes some npm audit vulnerabilities"',
            'Vulnerabilities will be fixed using npm-audit command',
            '[dependencies, security] labels will be added to pull requests',
            'Fixes will be automerged on next run'
        ]
    });
});

after(async function () {});
