import { Type } from './type';
import { inspect } from 'util';

/**
 * A union of literals. When you want to take an exact enum value.
 */
export function oneOf<T extends string>(literals: readonly T[]): Type<string, T> {
  const examples = literals.map(x => inspect(x)).join(', ');
  return {
    async from(str) {
      const value = literals.find(x => x === str);
      if (!value) {
        throw new Error(
          `Invalid value '${str}'. Expected one of: ${examples}`
        );
      }
      return value;
    },
    description: `One of ${examples}`,
  };
}
