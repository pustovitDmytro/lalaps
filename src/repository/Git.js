import path from 'path';
import SimpleGit from 'simple-git';
import fs from 'fs-extra';
import { v4 as uuid } from 'uuid';
import config from '../config';
import { advisoryList } from '../advisories';
import {
    createConfig,
    getConfig,
    validateConfig
} from './configUtils';
import * as res from './results';

const CONFIG_FILE_NAME = '.lalapsrc.json';
const CONFIG = config.git;

export default class Git {
    constructor(gitConfig) {
        const { url, repo } = gitConfig;
        const tmpFolder = CONFIG.tmpFolder;

        this.folder = path.resolve(tmpFolder, uuid());
        this.url = url;
        this.repoBranch = repo.branch;
    }

    async init() {
        await fs.ensureDir(this.folder);
        this.git = SimpleGit(this.folder);
        await this.git.clone(this.url, this.folder);
        await this.git.addConfig('user.name', CONFIG.name);
        await this.git.addConfig('user.email', CONFIG.email);
    }

    async clear() {
        await fs.remove(this.folder);
    }

    async checkConfig() {
        const raw = await getConfig(this.folder, CONFIG_FILE_NAME);

        if (raw) {
            const { valid, error } = await validateConfig(raw);

            if (error) return new res.INVALID_CONFIG(error);

            return new res.VALID_CONFIG(valid);
        }

        return new res.CONFIG_NOT_FOUND();
    }

    async checkout(branchName) {
        await this.git.checkoutBranch(branchName, this.repoBranch);
    }

    async generateDefaultConfig() {
        const detected = [];

        await Promise.all(advisoryList.map(async adv => {
            const promises = adv.Files.map(name => fs.exists(
                path.join(this.folder, name)
            ));
            const exists = await Promise.all(promises);

            if (exists.every(i => i)) {
                detected.push(adv);
            }
        }));

        if (detected.length > 0) {
            return createConfig(
                this.folder,
                CONFIG_FILE_NAME,
                detected.map(i => i.templates.defaultConfig)
            );
        }
    }

    // async uploadDefaultConfig(branchName) {
    //     await createConfig(this.folder, CONFIG_FILE_NAME);
    //     await this.uploadFiles(branchName, [ CONFIG_FILE_NAME ], 'Chore: Configure Lalaps');
    // }

    async uploadFiles(branchName, files, commitMessage) {
        await this.checkout(branchName);
        await this.git.add(files);
        await this.git.commit(commitMessage, files);
        await this.git.push(
            'origin',
            `${branchName}:${branchName}`,
            [ '--force-with-lease' ]
        );
    }
}
