import * as results from './results';

export default class Advisory {
    constructor({ advisory, folder, branchPrefix, commitMessagePartialFix, commitMessageFix  }) {
        this._advisory = advisory;
        this._folder = folder;
        this._branchPrefix = branchPrefix;
        this._commitMessages = {
            fix        : commitMessageFix,
            partialFix : commitMessagePartialFix
        };
    }

    async run() {
        const before = await this.check();

        if (!this.isVulnerable(before)) return new results.NOT_VULNERABLE();
        await this.fix();
        const after = await this.check();
        const { report, isFix, isPartialFix } = await this.compare(before, after);

        if (isFix) return new results.FULL_FIX({ report });
        if (isPartialFix) return new results.PARTIAL_FIX({ report });

        return new results.NO_FIX({ report });
    }

    getTragetBranch(res) {
        const { fix, partialFix } = this.constructor.branches;

        if (res instanceof results.PARTIAL_FIX) return `${this._branchPrefix}/${partialFix}`;
        if (res instanceof results.FULL_FIX) return `${this._branchPrefix}/${fix}`;
    }

    getConcurentBranch(res) {
        const { fix, partialFix } = this.constructor.branches;

        if (res instanceof results.FULL_FIX) return `${this._branchPrefix}/${partialFix}`;
        if (res instanceof results.PARTIAL_FIX) return `${this._branchPrefix}/${fix}`;
    }

    getPrTemplate(res) {
        const { prFix, prPartialFix } = this.constructor.templates;

        if (res instanceof results.PARTIAL_FIX) return prPartialFix;
        if (res instanceof results.FULL_FIX) return prFix;
    }

    getCommitMessage(res) {
        if (res instanceof results.PARTIAL_FIX) return this._commitMessages.partialFix;
        if (res instanceof results.FULL_FIX) return this._commitMessages.fix;
    }
}
