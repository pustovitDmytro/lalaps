import path from 'path';
import SimpleGit from 'simple-git';
import fs from 'fs-extra';
import { v4 as uuid } from 'uuid';
import {
    createConfig,
    getConfig,
    validateConfig
} from './utils';
import * as res from './results';

const CONFIG_FILE_NAME = '.lalapsrc.json';

// export async function writeGitAuthor(): Promise<void> {
//     const { gitAuthorName, gitAuthorEmail } = config;
//     try {
//       if (gitAuthorName) {
//         logger.debug({ gitAuthorName }, 'Setting git author name');
//         await git.addConfig('user.name', gitAuthorName);
//       }
//       if (gitAuthorEmail) {
//         logger.debug({ gitAuthorEmail }, 'Setting git author email');
//         await git.addConfig('user.email', gitAuthorEmail);
//       }
//     } catch (err) /* istanbul ignore next */ {
//       checkForPlatformFailure(err);
//       logger.debug(
//         { err, gitAuthorName, gitAuthorEmail },
//         'Error setting git author config'
//       );
//       throw new Error(TEMPORARY_ERROR);
//     }
//   }
  

export default class Git {
    constructor(gitConfig) {
        const { tmpFolder, url, repo } = gitConfig;

        this.folder = path.resolve(tmpFolder, uuid());
        this.url = url;
        this.repoBranch = repo.branch;
    }

    async init() {
        await fs.ensureDir(this.folder);
        this.git = SimpleGit(this.folder);
        await this.git.clone(this.url, this.folder);
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

    async uploadDefaultConfig(branchName) {
        await createConfig(this.folder, CONFIG_FILE_NAME);
        await this.uploadFiles(branchName, [ CONFIG_FILE_NAME ], 'Chore: Configure Lalaps');
    }

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
