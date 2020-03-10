import { From, OutputOf, InputOf } from './from';
import { Descriptive, Displayed } from './helpdoc';
import { Default } from './default';

export { identity, OutputOf, InputOf } from './from';

export type Type<From_, To> = From<From_, To> &
  Partial<Descriptive & Displayed & Default<To>>;

type PromiseValue<T> = T extends Promise<infer R> ? R : T;

export function extendType<
  T1 extends Type<any, any>,
  T2 extends Type<PromiseValue<OutputOf<T1>>, any>
>(
  t1: T1,
  t2: T2
): Omit<T1, 'from' | 'defaultValue'> &
  Omit<T2, 'from'> &
  From<InputOf<T1>, OutputOf<T2>> {
  const { defaultValue: _defaultValue, from: _from, ...t1WithoutDefault } = t1;

  return {
    ...t1WithoutDefault,
    ...t2,
    async from(a) {
      const f1Result = await t1.from(a);

      if (f1Result.result === 'error') {
        return f1Result;
      }

      return t2.from(f1Result.value);
    },
  };
}
