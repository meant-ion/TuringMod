import type { LoggerOverride } from './CustomLoggerWrapper';
import type { LogLevel } from './LogLevel';
export interface LoggerOptions {
    name: string;
    minLevel?: LogLevel | keyof typeof LogLevel | string;
    colors?: boolean;
    emoji?: boolean;
    timestamps?: boolean;
    custom?: LoggerOverride;
}
