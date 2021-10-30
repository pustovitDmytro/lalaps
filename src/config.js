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
        userId : +e.GITHUB_USER_ID
    },
    gitea : {
        url   : new URL(e.GITEA_URL),
        token : e.GITEA_TOKEN
    }
};
