import type { ObjMap, ObjMapPart } from '../../types/object';
export declare function arrayToObject<T, O, Obj>(arr: T[], fn: (value: T) => ObjMapPart<Obj, O>): ObjMap<Obj, O>;
