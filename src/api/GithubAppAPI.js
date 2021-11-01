import BaseAPI from 'base-api-client';
import dayjs from 'dayjs';
import jsonwebtoken from 'jsonwebtoken';

function tokenTimestamp(date) {
    return Math.floor(date.unix());
}

export default class GithubAppAPI extends BaseAPI {
    constructor(ghAppConfig) {
        const { tokenExpire, privateKey, appID, timeToRefresh } = ghAppConfig;

        super('https://api.github.com/app');
        this._tokenExpire = tokenExpire;
        this._privateKey = privateKey;
        this._appID = appID;
        this._timeToRefresh = timeToRefresh;
        this.createToken();
    }

    createToken() {
        const payload = {
            exp : tokenTimestamp(dayjs().add(this._tokenExpire)),
            iat : tokenTimestamp(dayjs().subtract(1, 'minute')),
            iss : this._appID
        };

        this.token = jsonwebtoken.sign(
            payload,
            this._privateKey,
            { algorithm: 'RS256' }
        );
    }

    refreshToken() {
        const payload = jsonwebtoken.decode(this.token);
        const expTime = dayjs.unix(payload.exp);
        const left = expTime.diff(dayjs(), 'millisecond');

        if (left < this._timeToRefresh) {
            this.createToken();

            return true;
        }
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
