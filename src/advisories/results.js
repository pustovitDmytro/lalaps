class AdvisoryResult {
    constructor({ report } = {}) {
        this.report = report;
    }
}

export class NOT_VULNERABLE extends AdvisoryResult {}
export class FULL_FIX extends AdvisoryResult {}
export class PARTIAL_FIX extends AdvisoryResult {}
export class NO_FIX extends AdvisoryResult {}

