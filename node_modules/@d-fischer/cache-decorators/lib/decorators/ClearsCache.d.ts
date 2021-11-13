export declare function ClearsCache<T>(cacheName: keyof T, numberOfArguments?: number): (target: any, propName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
