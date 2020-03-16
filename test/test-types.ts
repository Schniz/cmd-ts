import { identity } from '../src/from';
import { Type } from '../src/type';
import { InputOf, OutputOf } from '../src/from';

export const number: Type<string, number> = {
  async from(str) {
    const decoded = parseInt(str, 10);

    if (Number.isNaN(decoded)) {
      throw new Error('Not a number');
    } else {
      return decoded;
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
  defaultValue() {
    return false;
  },
};

export function optional<T extends Type<any, any>>(
  t: T
): Type<InputOf<T>, OutputOf<T> | undefined> {
  return {
    ...t,
    defaultValue(): OutputOf<T> | undefined {
      return undefined;
    },
  };
}
