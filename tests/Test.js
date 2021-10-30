import path from 'path';
import jsZip from 'jszip';
import fse from 'fs-extra';
import { tmpFolder, tmpReposDir } from './constants';

import './init-hooks';

export * from './utils';
// eslint-disable-next-line import/export
export * from './constants';

export default class Test {
    async setTmpFolder() {
        await fse.ensureDir(tmpFolder);
    }

    async cleanTmpFolder() {
        await fse.remove(tmpFolder);
    }

    async prepareRepositories(repoNames) {
        const seedReposDir = path.join(__dirname, './mock/repositories/');

        await fse.ensureDir(tmpReposDir);

        for (const repoName of repoNames) {
            const content = await fse.readFile(path.join(seedReposDir, `${repoName}.zip`));
            const zip = await jsZip.loadAsync(content);

            const promises = Object.keys(zip.files).map(async function (filename) {
                const fileData = await zip.files[filename].async('nodebuffer');
                const dst = path.join(tmpReposDir, filename);

                await (fileData.length > 0
                    ? fse.writeFile(dst, fileData)
                    : fse.ensureDir(dst)
                );
            });

            await Promise.all(promises);
        }
    }
}

