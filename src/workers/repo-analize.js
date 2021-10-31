/* eslint-disable unicorn/filename-case */
import platforms from '../platforms';
import { RUNNER } from '../namespaces';

export default async function (job) {
    const { platformName, repo } = job.data;
    const platform = platforms.find(p => p.constructor.name === platformName);

    if (!platform) throw new Error(`platform '${platformName}' not found`);

    const result = await new Promise((resolve, rej) => {
        RUNNER.run(async () => {
            const toPercentage = 10;

            RUNNER.set('notify', {
                runner     : 'bull',
                onMessage  : msg => job.log(msg),
                onProgress : p => job.progress(p * toPercentage)
            });

            try {
                const runner = await platform.getRepo(repo.name);
                const res = await runner.analize();

                resolve(res);
            } catch (error) {
                console.error(error);
                rej(error);
            }
        });
    });

    return result.describe;
}
