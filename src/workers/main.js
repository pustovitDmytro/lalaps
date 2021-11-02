import platforms from '../platforms';
import Queue from '../Queue';
import config from '../config';
import logger from '../logger';
import platformHandler from './platform-analize';

const mainQueue = new Queue({
    ...config.queue.main,
    redis : config.queue.redis
}, {
    ANALIZE_PLATFORM : platformHandler
});

export default async function () {
    const res = [];

    for (const platform of platforms) {
        if (platform.shouldAnalize) {
            const job = await mainQueue.createJob(
                'ANALIZE_PLATFORM',
                {
                    platformName : platform.constructor.name
                }
            );

            const result = {
                platform : platform.constructor.name,
                job      : job.id
            };

            logger.log('info', {
                type : 'ANALIZE_PLATFORM',
                ...result
            });
            res.push(result);
        }
    }

    return res;
}
