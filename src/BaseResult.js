export default class BaseResult {
    #payload;

    constructor(payload) {
        this.#payload = payload;
    }

    get describe() {
        return `action finished: ${this.constructor.name}`;
    }

    get _payload() {
        return this.#payload;
    }
}
