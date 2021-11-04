import BaseResult from '../BaseResult';

class AdvisoryResult extends BaseResult {}

export class NOT_VULNERABLE extends AdvisoryResult {}
export class FULL_FIX extends AdvisoryResult {}
export class PARTIAL_FIX extends AdvisoryResult {}
export class NO_FIX extends AdvisoryResult {}

