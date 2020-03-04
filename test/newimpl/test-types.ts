import { From, identity } from '../../src/newimpl/from';
import { Descriptive, Displayed } from '../../src/newimpl/helpdoc';

export const number: From<string, number> & Descriptive & Displayed = {
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

export const string = {
  ...identity<string>(),
  description: 'a string',
};
export const boolean = {
  ...identity<boolean>(),
  description: 'a boolean',
};
