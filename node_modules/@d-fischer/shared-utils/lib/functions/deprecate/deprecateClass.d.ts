import type { Constructor } from '../../types/constructor';
export declare function deprecateClass<T extends Constructor<any>>(Base: T, msg: string): T;
