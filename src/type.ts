import { From, OutputOf, InputOf, FromFn } from './from';
import { Descriptive, Displayed } from './helpdoc';
import { Default } from './default';

export { identity, OutputOf, InputOf } from './from';

export type Type<From_, To> = From<From_, To> &
  Partial<Descriptive & Displayed & Default<To>>;

function fromFn<A, B>(t: FromFn<A, B> | From<A, B>): FromFn<A, B> {
  if (typeof t === 'function') {
    return t;
  } else {
    return t.from;
  }
}

function typeDef<T extends From<any, any> | FromFn<any, any>>(from: T): T extends FromFn<any, any> ? {} : Omit<T, 'from'> {
  if (typeof from === 'function') {
    return {} as any;
  } else {
    return from as any;
  }
}

export function extendType<
  T1 extends Type<any, any>,
  T2 extends Type<OutputOf<T1>, any> | FromFn<OutputOf<T1>, any>
>(
  t1: T1,
  t2: T2
): Omit<T1, 'from' | 'defaultValue'> &
  (T2 extends FromFn<any, any> ? unknown : Omit<T2, 'from'>) &
  From<InputOf<T1>, OutputOf<T2>> {
  const { defaultValue: _defaultValue, from: _from, ...t1WithoutDefault } = t1;
  const t2Object = typeDef(t2);
  const t2From = fromFn(t2);

  return {
    ...t1WithoutDefault,
    ...t2Object,
    async from(a) {
      const f1Result = await t1.from(a);

      if (f1Result.result === 'error') {
        return f1Result;
      }

      const f2Result = await t2From(f1Result.value);
      return f2Result;
    },
  };
}

export type HasType<T extends Type<any, any>> = {
  /** The value decoding strategy for this item */
  type: T;
};
