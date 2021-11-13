export declare function partitionedFlatMap<T, R>(arr: T[], keyMapper: (val: T) => string, valueMapper: (val: T) => R | R[]): Record<string, R[]>;
