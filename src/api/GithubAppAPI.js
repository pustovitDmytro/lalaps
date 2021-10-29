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
        return this.get('/installations');
    }

    async createAcessToken(installationId) {
        return this.post(`/installations/${installationId}/access_tokens`);
    }
}
