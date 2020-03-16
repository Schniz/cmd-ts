export type FromFn<A, B> = (input: A) => Promise<B>;

/** A safe conversion from type A to type B */
export type From<A, B> = {
  /**
   * Convert `input` safely and asynchronously into an output.
   */
  from: FromFn<A, B>;
};

/** The output of a conversion type or function */
export type OutputOf<
  F extends From<any, any> | FromFn<any, any>
> = F extends From<any, infer Output>
  ? Output
  : F extends FromFn<any, infer Output>
  ? Output
  : never;

/** The input of a conversion type or function */
export type InputOf<
  F extends From<any, any> | FromFn<any, any>
> = F extends From<infer Input, any>
  ? Input
  : F extends FromFn<infer Input, any>
  ? Input
  : never;

/**
 * A type "conversion" from any type to itself
 */
export function identity<T>(): From<T, T> {
  return {
    async from(a) {
      return a;
    },
  };
}
