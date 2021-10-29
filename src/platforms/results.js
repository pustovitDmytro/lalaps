class PlatformResults {
    constructor(payload) {
        this.payload = payload;
    }
}

export class ONBOARDING_PR_OPEN extends PlatformResults {}
export class ONBOARDING_PR_CLOSED extends PlatformResults {}
export class BRANCH_NOT_FOUND extends PlatformResults {}
export class BRANCH_TOUCHED extends PlatformResults {}
export class BRANCH_MINE extends PlatformResults {}
export class FIX_PR_OPEN extends PlatformResults {}
export class FIX_PR_MERGED extends PlatformResults {}

