export type DecodeResult<T> =
  | { result: 'ok'; value: T }
  | { result: 'warning'; value: T; message: string }
  | { result: 'error'; message: string };
export type From<A, B> = {
  from(value: A): DecodeResult<B>;
};
export type FromString<T> = From<string, T>;
export type FromStringArray<T> = From<string[], T>;
export type OutputOf<F extends From<any, any>> = F extends From<
  any,
  infer Output
>
  ? Output
  : never;
export type InputOf<F extends From<any, any>> = F extends From<infer Input, any>
  ? Input
  : never;

export function from<F extends From<any, any>>(f: F): F {
  return f;
}

export function extend<F extends From<any, any>, B>(
  f1: F,
  f2: From<OutputOf<F>, B>
): Omit<F, 'from'> & From<InputOf<F>, B> {
  return {
    ...f1,
    from: a => {
      const f1Result = f1.from(a);
      switch (f1Result.result) {
        case 'error': {
          return f1Result;
        }
        case 'ok':
        case 'warning': {
          return f2.from(f1Result.value);
        }
      }
    },
  };
}
