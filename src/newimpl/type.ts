import { From, OutputOf, InputOf } from './from';
import { Descriptive, Displayed } from './helpdoc';
export { OutputOf, InputOf } from './from';

export type Type<From_, To> = From<From_, To> &
  Partial<Descriptive & Displayed>;

export function extend<
  T1 extends Type<any, any>,
  T2 extends Type<OutputOf<T1>, any>
>(
  t1: T1,
  t2: T2
): Omit<T1, 'from'> & Omit<T2, 'from'> & From<InputOf<T1>, OutputOf<T2>> {
  return {
    ...t1,
    ...t2,
    from(a) {
      const f1Result = t1.from(a);
      switch (f1Result.result) {
        case 'error':
          return f1Result;
        case 'ok':
          return t2.from(f1Result.value);
      }
    },
  };
}
