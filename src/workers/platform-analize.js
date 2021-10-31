/* eslint-disable unicorn/filename-case */
import Queue from '../Queue';
import config from '../config';
import platforms from '../platforms';
import { RUNNER } from '../namespaces';
import repoHandler from './repo-analize';

const repoQueue = new Queue({
    ...config.queue.repo,
    redis : config.queue.redis
}, {
    ANALIZE_REPOSITORY : repoHandler
});

export default async function (job) {
    const { data } = job;
    const { platformName } = data;
    const platform = platforms.find(p => p.constructor.name === platformName);

    if (!platform) throw new Error(`platform '${platformName}' not found`);

    const repos = await new Promise((res, rej) => {
        RUNNER.run(async () => {
            const toPercentage = 10;

            RUNNER.set('notify', {
                runner     : 'bull',
                onMessage  : msg => job.log(msg),
                onProgress : p => job.progress(p * toPercentage)
            });

            try {
                const repositories = await platform.analize({});

                repositories.forEach(repo => {
                    repoQueue.createJob(
                        'ANALIZE_REPOSITORY',
                        { repo, platformName }
                    );
                });

                return res(repositories);
            } catch (error) {
                console.error(error);
                rej(error);
            }
        });
    });

    return repos.map(r => r.name);
}
