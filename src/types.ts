import { Type, identity, InputOf, OutputOf } from './type';

/**
 * A number type to be used with `option`
 *
 * Throws an error when the provided string is not a number
 */
export const number: Type<string, number> = {
  async from(str) {
    const decoded = parseFloat(str);

    if (Number.isNaN(decoded)) {
      throw new Error('Not a number');
    } else {
      return decoded;
    }
  },
  displayName: 'number',
  description: 'a number',
};

/**
 * A string type to be used with `option`.
 */
export const string: Type<string, string> = {
  ...identity(),
  description: 'a string',
  displayName: 'str',
};

/**
 * A boolean type to be used with `flag`.
 */
export const boolean: Type<boolean, boolean> = {
  ...identity(),
  description: 'a boolean',
  displayName: 'true/false',
  defaultValue() {
    return false;
  },
};

/**
 * Makes any type optional, by defaulting to `undefined`.
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

/**
 * Transforms any type into an array, useful for `multioption` and `multiflag`.
 */

export function array<T extends Type<any, any>>(
  t: T
): Type<InputOf<T>[], OutputOf<T>[]> {
  return {
    ...t,
    async from(inputs: InputOf<T>[]): Promise<OutputOf<T>[]> {
      return Promise.all(inputs.map((input) => t.from(input)));
    },
  };
}
