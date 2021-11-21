import dotenv from 'dotenv';
import cottus, { Assembler } from 'cottus';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.defaults' });

const e = process.env;

const schema = {
    github : {
        app : {
            privateKey    : { $source: '{GITHUB_APP_PRIVATE_KEY}', $validate: [ 'required', 'encryption_key' ] },
            tokenExpire   : { $source: '{GITHUB_APP_TOKEN_EXPIRE}', $validate: [ 'required', 'time_unit' ] },
            timeToRefresh : { $source: '{GITHUB_APP_TOKEN_REFRESH}', $validate: [ 'required', 'time_unit' ] },
            appID         : { $source: '{GITHUB_APP_ID}', $validate: [ 'required', 'integer' ] }
        },
        userId   : { $source: '{GITHUB_USER_ID}', $validate: [ 'required', 'integer' ] },
        userName : { $source: '{GITHUB_USER_NAME}', $validate: [ 'required', 'string' ] },
        analyze  : { $source: '{GITHUB_ANALIZE}', $validate: [ 'required', 'boolean' ] }
    },

    gitea : e.GITEA_URL ? {
        url     : { $source: '{GITEA_URL}', $validate: [ 'required', 'url' ] },
        token   : { $source: '{GITEA_TOKEN}', $validate: [ 'required', 'string' ] },
        analyze : { $source: '{GITEA_ANALIZE}', $validate: [ 'required', 'boolean' ] }
    } : null,

    git : {
        tmpFolder : { $source: '{TMP_FOLDER}', $validate: [ 'required', 'path' ] },
        name      : { $source: '{GIT_USER}', $validate: [ 'required', 'string' ] },
        email     : { $source: '{GIT_EMAIL}', $validate: [ 'required', 'email' ] }
    },
    queue : {
        redis : {
            port     : { $source: '{REDIS_PORT}', $validate: [ 'required', 'port' ] },
            host     : { $source: '{REDIS_HOST}', $validate: [ 'required', 'hostname' ] },
            db       : { $source: '{REDIS_DB}', $validate: [ 'integer' ] },
            password : { $source: '{REDIS_PASSWORD}', $validate: [ 'string' ] },
            username : { $source: '{REDIS_USER}', $validate: [ 'string' ] }
        },
        main : {
            name        : { $source: '{MAIN_QUEUE_NAME}', $validate: [ 'required', 'string' ] },
            ttl         : { $source: '{MAIN_QUEUE_TTL}', $validate: [ 'required', 'time_unit' ] },
            attempts    : { $source: '{MAIN_QUEUE_ATTEMPTS}', $validate: [ 'required', 'integer', { 'min': 1 } ] },
            concurrency : { $source: '{MAIN_QUEUE_CONCURRENCY}', $validate: [ 'required', 'integer', { 'min': 1 } ] },
            logLevel    : {
                $source   : '{MAIN_QUEUE_LOG_LEVEL}',
                $validate : [ 'required', { 'enum': [ 'error', 'warn', 'info', 'notice', 'verbose', 'debug' ] } ]
            },
            repeat     : { $source: '{MAIN_QUEUE_REPEAT}', $validate: [ 'cron' ] },
            canProcess : { $source: '{MAIN_QUEUE_PROCESS}', $validate: [ 'required', 'boolean' ] },
            backoff    : e.REPO_QUEUE_BACKOFF_TYPE ? {
                type  : { $source: '{MAIN_QUEUE_BACKOFF_TYPE}', $validate: [ 'string' ] },
                delay : { $source: '{MAIN_QUEUE_BACKOFF_DELAY}', $validate: [ 'string' ] }
            } : null
        },
        repo : {
            name        : { $source: '{REPO_QUEUE_NAME}', $validate: [ 'required', 'string' ] },
            ttl         : { $source: '{REPO_QUEUE_TTL}', $validate: [ 'required', 'time_unit' ] },
            attempts    : { $source: '{REPO_QUEUE_ATTEMPTS}', $validate: [ 'required', 'integer', { 'min': 1 } ] },
            concurrency : { $source: '{REPO_QUEUE_CONCURRENCY}', $validate: [ 'required', 'integer', { 'min': 1 } ] },
            logLevel    : {
                $source   : '{REPO_QUEUE_LOG_LEVEL}',
                $validate : [ 'required', { 'enum': [ 'error', 'warn', 'info', 'notice', 'verbose', 'debug' ] } ]
            },
            // repeat     : { $source: '{REPO_QUEUE_REPEAT}', $validate: [ 'cron' ] },
            canProcess : { $source: '{REPO_QUEUE_PROCESS}', $validate: [ 'required', 'boolean' ] },
            backoff    : e.REPO_QUEUE_BACKOFF_TYPE ? {
                type  : { $source: '{REPO_QUEUE_BACKOFF_TYPE}', $validate: [ 'string' ] },
                delay : { $source: '{REPO_QUEUE_BACKOFF_DELAY}', $validate: [ 'string' ] }
            } : null
        }
    },
    web : {
        port  : { $source: '{PORT}', $validate: [ 'required', 'port' ] },
        start : { $source: '{WEB_START}', $validate: [ 'required', 'boolean' ] },
        admin : {
            password : { $source: '{BASIC_ADMIN_PASSWORD}', $validate: [ 'required', 'string' ] }
        }
    },
    verification : {
        $source   : { type: 'complex_array', prefix: 'VERIFICATION_' },
        $validate : {
            'fileName' : { $source: '{_FILE_NAME}', $validate: [ 'required', 'path' ] },
            'content'  : { $source: '{_CONTENT}', $validate: [ 'required', 'string' ] }
        }
    }
};

const assembler = new Assembler(cottus, schema);

assembler.parse();

const config = assembler.run(e);

export default config;
