import path from 'path';
import fs from 'fs-extra';
import { flatten } from 'myrmidon';
import advisories from '../advisories';

const templatesDir = path.join(__dirname, '../../templates');

export async function getConfig(folder, name) {
    const fileName = path.join(folder, name);
    const isExists = await fs.exists(path.join(folder, name));

    return isExists && fs.readFile(fileName, 'utf8');
}

export async function validateConfig(raw) {
    try {
        const valid = JSON.parse(raw);

        return { valid };
    } catch (error) {
        return { error };
    }
}

export async function createConfig(folder, name, rules) {
    const [ defaultConfig, ...rulesConfigs ] = await Promise.all([
        await fs.readJSON(path.join(templatesDir, 'onboarding/default_config.json')),
        ...rules.map(rule => fs.readJSON(path.join(templatesDir, rule)))
    ]);

    const config = {
        ...defaultConfig,
        rules : flatten(rulesConfigs)
    };

    await fs.writeJSON(path.join(folder, name), config, { spaces: 2 });

    return config;
}

export async function describeConfig(config) {
    const { rules, ...base } = config;

    return rules.map(ruleConf => {
        const rule = { ...base, ...ruleConf };
        const Advisory = advisories[rule.advisory];
        const advisory = new Advisory(rule);
        const messages = advisory.describe;

        if (rule.labels?.length) {
            messages.push(`[${rule.labels.join(', ')}] labels will be added to pull requests`);
        }

        if (rule.automerge) messages.push('Fixes will be automerged on next run');

        return {
            type        : 'npm',
            description : messages
        };
    });
}
