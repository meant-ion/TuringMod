export interface CacheEntry<T = unknown> {
    value: T;
    expires: number;
}
