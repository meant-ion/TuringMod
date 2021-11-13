export declare function isNullish<T>(value: T | null | undefined): value is null | undefined;
export declare function mapNullable<I, O>(value: I | null | undefined, cb: (val: I) => O): O | null;
export declare function mapOptional<I, O>(value: I | null | undefined, cb: (val: I) => O): O | undefined;
