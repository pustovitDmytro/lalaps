/* eslint-disable unicorn/filename-case */
import platforms from '../platforms';

export default async function (job) {
    const { platformName, repo } = job.data;
    const platform = platforms.find(p => p.constructor.name === platformName);

    if (!platform) throw new Error(`platform '${platformName}' not found`);

    const runner = await platform.getRepo(repo.name);
    const result = await runner.analize();

    return result.describe;
}
