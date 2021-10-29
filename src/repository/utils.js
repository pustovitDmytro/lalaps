import path from 'path';
import fs from 'fs-extra';

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


export async function createConfig(folder, name) {
    await fs.copy(
        path.join(templatesDir, 'onboarding', 'default_config.json'),
        path.join(folder, name)
    );

    return name;
}
