/* eslint-disable unicorn/filename-case */
import Queue from '../Queue';
import config from '../config';
import platforms from '../platforms';
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

    const [ repositories, pendingJobs ] = await Promise.all([
        platform.analize({}),
        repoQueue.findPendingJobs()
    ]);

    const filteredRepos = repositories.filter(r => !pendingJobs.some(pendingJob => pendingJob.data.repo?.id === r.id));

    job.log(`${filteredRepos.length} repositories of ${repositories.length} will be added to queue`);

    repositories.forEach(repo => {
        repoQueue.createJob(
            'ANALIZE_REPOSITORY',
            { repo, platformName }
        );
    });

    return repositories.map(r => r.name);
}
