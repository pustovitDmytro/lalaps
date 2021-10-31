import Bull from 'bull';
import ms from 'ms';
import packageConfig from '../package';
import logger, { log }  from './logger';

const QUEUES = [];

function dumpJob(job) {
    return job.toJSON();
}

export default class Queue {
    static createQuue({
        redis,
        name,
        rateLimit
    }) {
        return new Bull(name, {
            limiter : rateLimit && {
                max      : rateLimit.max,
                duration : rateLimit.duration
            },
            redis : {
                port     : redis.port,
                host     : redis.host,
                db       : redis.db,
                password : redis.password
            },
            prefix : packageConfig.name
        });
    }

    constructor(opts, jobs = {}) {
        this.ttl = opts.ttl;
        this.attempts = opts.attempts;
        this.backoff = opts.backoff;
        this.concurrency = opts.concurrency;
        this.rateLimit = opts.rateLimit;
        this.name = opts.name;
        this.repeat = opts.repeat;
        this.logLevel = opts.logLevel;

        this.queue = Queue.createQuue({
            name      : this.name,
            redis     : opts.redis,
            rateLimit : opts.rateLimit
        });

        if (!opts.canProcess) {
            this.queue.pause(true);
        }

        this.jobTypes = Object.keys(jobs);

        this.jobTypes.forEach(type => {
            const decoratorConfig = {
                level           : this.logLevel,
                paramsSanitizer : params => params[0]?.data,
                methodName      : `queue.${this.name}.${type}`
            };

            this.queue.process(
                type,
                this.concurrency,
                log(decoratorConfig)(jobs[type])
            );
        });

        this.queue.on('error', logger.error);
        this.queue.on('failed', (job, error) => {
            logger.error({ job: dumpJob(job), error });
        });

        QUEUES.push(this);
    }


    @log({ level: 'verbose', resultSanitizer: dumpJob })
    async createJob(type, data, options = {}) {
        if (!this.jobTypes.includes(type)) throw new Error(`WRONG_JOB_TYPE: ${type}`);

        return this.queue.add(type, data, {
            timeout : this.ttl,
            backoff : {
                type  : this.backoff.type,
                delay : this.backoff.delay
            },
            attempts         : this.attempts,
            removeOnComplete : this.removeOnComplete,
            repeat           : this.repeat ? { cron: this.repeat } : null,
            ...options
        });
    }

    async findActiveJobs() {
        return this.queue.getJobs([ 'active' ]);
    }

    async close() {
        const isConnected = this.queue.clients[0].status === 'ready';

        if (isConnected) {
            await this.queue.pause(true)
                .catch(error => logger.error({
                    code : 'QUEUE_CLOSE',
                    name : this.name,
                    error
                }));
        }
    }

    async clean() {
        const states = [ 'active', 'paused', 'failed', 'completed' ];
        const res = { cleaned: [] };

        await Promise.all(states.map(async state => {
            const jobs = await this.queue.getJobs([ state ]);

            res[state] = jobs.length;
        }));
        await Promise.all(states.map(async state => {
            await this.queue.clean(ms('1m'), state);
            res.cleaned.push(state);
        }));

        return res;
    }

    static async clean() {
        await Promise.all(QUEUES.map(queue => queue.clean()));
    }
}

export async function onShutdown() {
    await Promise.all(QUEUES.map(queue => queue.close()));
}
