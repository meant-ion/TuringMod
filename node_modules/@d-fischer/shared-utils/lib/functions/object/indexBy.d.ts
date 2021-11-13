import type { KeyMapper } from '../../types/object';
export declare function indexBy<T>(arr: T[], keyFn: Extract<keyof T, string> | KeyMapper<T>): Record<string, T>;
