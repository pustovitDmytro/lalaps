import BaseResult from '../BaseResult';

class PlatformResults extends BaseResult {}

export class ONBOARDING_PR_OPEN extends PlatformResults {}
export class ONBOARDING_PR_CLOSED extends PlatformResults {}
export class NO_ADVISORY_FOUND extends PlatformResults {}
export class BRANCH_NOT_FOUND extends PlatformResults {}
export class BRANCH_TOUCHED extends PlatformResults {}
export class BRANCH_MINE extends PlatformResults {}

class FIX_PR extends PlatformResults {
    get pr() {
        return this._payload.pr;
    }

    get report() {
        const { advisory } = this._payload;

        return advisory.report;
    }
}

export class FIX_PR_OPEN extends FIX_PR {}
export class FIX_PR_MERGED extends FIX_PR {}

