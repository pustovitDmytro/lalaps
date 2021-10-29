class RepoResults {
    constructor(payload) {
        this.payload = payload;
    }
}

export class VALID_CONFIG extends RepoResults {}
export class INVALID_CONFIG extends RepoResults {}
export class CONFIG_NOT_FOUND extends RepoResults {}
