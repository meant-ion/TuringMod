interface MatchStep<I, O> {
    on: (predicate: (val: I) => boolean, fn: (val: I) => O) => MatchStep<I, O>;
    otherwise: (fn: (val: I) => O) => O;
}
declare const match: {
    <I, O>(x: I): MatchStep<I, O>;
    eq: <T>(x: T) => <T2 extends T>(y: T2) => boolean;
};
export declare const eq: <T>(x: T) => <T2 extends T>(y: T2) => boolean;
export { match };
