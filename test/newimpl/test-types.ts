import { identity, DecodeResult } from '../../src/newimpl/from';
import { Type } from '../../src/newimpl/type';
import { InputOf, OutputOf } from '../../src/newimpl/from';

export const number: Type<string, number> = {
  from(str) {
    const decoded = parseInt(str, 10);

    if (Number.isNaN(decoded)) {
      return { result: 'error', message: 'Not a number' };
    } else {
      return { result: 'ok', value: decoded };
    }
  },
  displayName: 'number',
  description: 'a number',
};

export function single<T extends Type<any, any>>(
  t: T
): Omit<T, 'from'> & Type<InputOf<T>[], OutputOf<T>> {
  return {
    ...t,
    from(ts) {
      if (ts.length === 0) {
        return { result: 'error', message: `No value provided` };
      }

      if (ts.length > 1) {
        return {
          result: 'error',
          message: `Too many arguments provided. Expected 1, got: ${ts.length}`,
        };
      }

      return t.from(ts[0]);
    },
  };
}

export const string: Type<string, string> = {
  ...identity(),
  description: 'a string',
  displayName: 'str',
};

export const boolean: Type<boolean, boolean> = {
  ...identity(),
  description: 'a boolean',
  displayName: 'true/false',
};

export function arrayOf<T extends Type<any, any>>(
  t: T
): Omit<T, 'from'> & Type<InputOf<T>[], OutputOf<T>[]> {
  return {
    ...t,
    from(ts) {
      return ts.reduce<DecodeResult<OutputOf<T>[]>>(
        (acc, curr) => {
          if (acc.result === 'error') {
            return acc;
          } else {
            const current = t.from(curr);
            if (current.result === 'ok') {
              return {
                result: 'ok',
                value: [...acc.value, current.value],
              } as DecodeResult<OutputOf<T>[]>;
            }
            return acc;
          }
        },
        { result: 'ok', value: [] }
      );
    },
  };
}
