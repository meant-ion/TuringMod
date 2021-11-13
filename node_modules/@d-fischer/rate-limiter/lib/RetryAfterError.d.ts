import { CustomError } from './CustomError';
export declare class RetryAfterError extends CustomError {
    private readonly _retryAt;
    constructor(after: number);
    get retryAt(): number;
}
