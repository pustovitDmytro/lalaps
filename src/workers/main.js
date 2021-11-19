import platforms from '../platforms';
import Queue from '../Queue';
import config from '../config';
import logger from '../logger';
import platformHandler from './platform-analyze';

const mainQueue = new Queue({
    ...config.queue.main,
    redis : config.queue.redis
}, {
    ANALYZE_PLATFORM : platformHandler
});

export default async function () {
    const res = [];

    for (const platform of platforms) {
        if (platform.shouldAnalize) {
            const job = await mainQueue.createJob(
                'ANALYZE_PLATFORM',
                {
                    platformName : platform.constructor.name
                }
            );

            const result = {
                platform : platform.constructor.name,
                job      : job.id
            };

            logger.log('info', {
                type : 'ANALYZE_PLATFORM',
                ...result
            });
            res.push(result);
        }
    }

    return res;
}
