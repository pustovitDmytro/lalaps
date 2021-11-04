export default class BaseResult {
    constructor(payload) {
        this.payload = payload;
    }

    get describe() {
        return `action finished: ${this.constructor.name}`;
    }
}
