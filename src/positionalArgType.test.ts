import * as t from 'io-ts';
import { NumberFromString } from 'io-ts-types/lib/NumberFromString';
import { positionalArgType } from './positionalArgType';
import { expectToBeRight } from './jest-fp-ts';

test('empty tuple', () => {
  const emptyTuple = positionalArgType([]);
  const result = emptyTuple.decode(['hello', 'world']);
  expectToBeRight(result);
  expect(result.right).toEqual({
    matched: [],
    rest: ['hello', 'world'],
  });
});

test('a matched element', () => {
  const emptyTuple = positionalArgType([NumberFromString]);
  const result = emptyTuple.decode(['100', 'world']);
  expectToBeRight(result);
  expect(result.right).toEqual({
    matched: [100],
    rest: ['world'],
  });
});

test('all elements matched', () => {
  const emptyTuple = positionalArgType([NumberFromString, t.string]);
  const result = emptyTuple.decode(['100', 'world']);
  expectToBeRight(result);
  expect(result.right).toEqual({
    matched: [100, 'world'],
    rest: [],
  });
});
