import BaseAPI from 'base-api-client';
import dayjs from 'dayjs';
import jsonwebtoken from 'jsonwebtoken';

function tokenTimestamp(date) {
    return Math.floor(date.unix());
}

export default class GithubAppAPI extends BaseAPI {
    constructor(ghAppConfig) {
        const { tokenExpire, privateKey, appID } = ghAppConfig;

        super('https://api.github.com/app');
        const payload = {
            exp : tokenTimestamp(dayjs().add(tokenExpire)),
            iat : tokenTimestamp(dayjs().subtract(1, 'minute')),
            iss : appID
        };

        this.token = jsonwebtoken.sign(
            payload,
            privateKey,
            { algorithm: 'RS256' }
        );
    }

    getHeaders() {
        return {
            Authorization : `Bearer ${this.token}`,
            Accept        : 'application/vnd.github.v3+json'
        };
    }

    async listInstallations() {
        const installations = await this.get('/installations');

        return installations.map(i => dumpInstallation(i));
    }

    async createAcessToken(installationId) {
        const token =  await this.post(`/installations/${installationId}/access_tokens`);

        return dumpAccessToken(token);
    }
}

function dumpInstallation(i) {
    return { id: i.id };
}

function dumpAccessToken(t) {
    return {
        token : t.token
    };
}
