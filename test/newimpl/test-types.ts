import { NumberFromString } from 'io-ts-types/lib/NumberFromString';
import { From, identity } from '../../src/newimpl/from';
import { Descriptive } from '../../src/newimpl/helpdoc';

export const number: From<string, number> & Descriptive = {
  from(str) {
    const decoded = NumberFromString.decode(str);
    if (decoded._tag === 'Right') {
      return { result: 'ok', value: decoded.right };
    } else {
      return { result: 'error', message: 'Not a number' };
    }
  },
  description: 'a number',
};

export const string = {
  ...identity<string>(),
  description: 'a string',
};
export const boolean = {
  ...identity<boolean>(),
  description: 'a boolean',
};
