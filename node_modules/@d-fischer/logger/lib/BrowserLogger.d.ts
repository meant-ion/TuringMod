import type { LogLevel } from './LogLevel';
import { BaseLogger } from './BaseLogger';
export declare class BrowserLogger extends BaseLogger {
    log(level: LogLevel, message: string): void;
}
