import platforms from '../platforms';
import Queue from '../Queue';
import config from '../config';
import platformHandler from './platform-analize';

const mainQueue = new Queue({
    ...config.queue.main,
    redis : config.queue.redis
}, {
    ANALIZE_PLATFORM : platformHandler
});

for (const platform of platforms) {
    if (platform.shouldAnalize) {
        mainQueue.createJob(
            'ANALIZE_PLATFORM',
            {
                platformName : platform.constructor.name
            }
        );
    }
}
