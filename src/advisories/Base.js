import * as results from './results';

export default class Advisory {
    constructor(config) {
        this._advisory = config.advisory;
        this._folder = config.folder;
        this._branchPrefix = config.branchPrefix;
        this._branchMid = config.branch;
        this._commitMessages = {
            fix        : config.commitMessageFix,
            partialFix : config.commitMessagePartialFix
        };
    }

    get describe() {
        const fix = new results.FULL_FIX();
        const partFix = new results.PARTIAL_FIX();

        return [
            `Full fix will be pushed to "${this.getTragetBranch(fix)}" branch with commit message "${this.getCommitMessage(fix)}"`,
            `Partial fix will be pushed to "${this.getTragetBranch(partFix)}" with commit message "${this.getCommitMessage(partFix)}"`
        ];
    }

    async run() {
        const before = await this.check();

        if (!this.isVulnerable(before)) {
            const mockReport = await this.compare(before, before);

            return new results.NOT_VULNERABLE({ report: mockReport.report });
        }

        await this.fix();
        const after = await this.check();
        const { report, isFix, isPartialFix } = await this.compare(before, after);

        if (isFix) return new results.FULL_FIX({ report });
        if (isPartialFix) return new results.PARTIAL_FIX({ report });

        return new results.NO_FIX({ report });
    }

    getTragetBranch(res) {
        const { fix, partialFix } = this.constructor.branches;

        if (res instanceof results.PARTIAL_FIX) return `${this._branchPrefix}/${this._branchMid}-${partialFix}`;
        if (res instanceof results.FULL_FIX) return `${this._branchPrefix}/${this._branchMid}-${fix}`;
    }

    getConcurentBranch(res) {
        const { fix, partialFix } = this.constructor.branches;

        if (res instanceof results.FULL_FIX) return `${this._branchPrefix}/${this._branchMid}-${partialFix}`;
        if (res instanceof results.PARTIAL_FIX) return `${this._branchPrefix}/${this._branchMid}-${fix}`;
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

    getAutoCloseReason(res) {
        const { alreadyFixed, noFix } = this.constructor.templates;

        if (res instanceof results.NOT_VULNERABLE) return alreadyFixed;
        if (res instanceof results.NO_FIX) return noFix;
    }

    static branches = {
        fix        : 'fix',
        partialFix : 'partial-fix'
    }
}
