import dotenv from 'dotenv';
import ms from 'ms';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.defaults' });

const e = process.env;

export default {
    github : {
        app : {
            privateKey  : e.GITHUB_APP_PRIVATE_KEY,
            tokenExpire : ms(e.GITHUB_APP_TOKEN_EXPIRE),
            appID       : +e.GITHUB_APP_ID
        },
        userId  : +e.GITHUB_USER_ID,
        analize : true
    },
    gitea : {
        url     : new URL(e.GITEA_URL),
        token   : e.GITEA_TOKEN,
        analize : false
    },
    git : {
        tmpFolder : e.TMP_FOLDER,
        name      : e.GIT_USER,
        email     : e.GIT_EMAIL
    },
    queue : {
        redis : {
            port     : +e.REDIS_PORT,
            host     : e.REDIS_HOST,
            db       : e.REDIS_DB,
            password : e.REDIS_PASSWORD
        },
        main : {
            name     : e.MAIN_QUEUE_NAME,
            ttl      : ms(e.MAIN_QUEUE_TTL),
            attempts : +e.MAIN_QUEUE_ATTEMPTS,
            backoff  : {
                type  : e.MAIN_QUEUE_BACKOFF_TYPE,
                delay : ms(e.MAIN_QUEUE_BACKOFF_DELAY)
            },
            concurrency : +e.MAIN_QUEUE_CONCURRENCY,
            logLevel    : e.MAIN_QUEUE_LOG_LEVEL,
            repeat      : e.MAIN_QUEUE_REPEAT,
            canProcess  : e.MAIN_QUEUE_PROCESS
        },
        repo : {
            name     : e.REPO_QUEUE_NAME,
            ttl      : ms(e.REPO_QUEUE_TTL),
            attempts : +e.REPO_QUEUE_ATTEMPTS,
            backoff  : {
                type  : e.REPO_QUEUE_BACKOFF_TYPE,
                delay : ms(e.REPO_QUEUE_BACKOFF_DELAY)
            },
            concurrency : +e.REPO_QUEUE_CONCURRENCY,
            logLevel    : e.REPO_QUEUE_LOG_LEVEL,
            canProcess  : e.REPO_QUEUE_PROCESS
        }
    },
    admin : {
        basic : {
            adminPassword : e.BASIC_ADMIN_PASSWORD
        }
    }
};
