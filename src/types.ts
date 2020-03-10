import { Type, identity, InputOf, OutputOf } from './type';

export const number: Type<string, number> = {
  async from(str) {
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

/**
 * Makes any Type optional, by defaulting to `undefined`.
 */
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
