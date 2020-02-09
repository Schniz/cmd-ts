import { tupleWithOneElement } from '../src/tupleWithOneElement';
import * as t from 'io-ts';
import { expectToBeRight, expectToBeLeft } from './fp-ts-helpers';

it('accepts one element', () => {
  const oneString = tupleWithOneElement(t.string);
  const result = oneString.decode(['hello']);
  expectToBeRight(result);
  expect(result.right).toBe('hello');
});

it('fails on 0 elements', () => {
  const oneString = tupleWithOneElement(t.string);
  const result = oneString.decode([]);
  expectToBeLeft(result);
});

it('fails on >1 elements', () => {
  const oneString = tupleWithOneElement(t.string);
  const result = oneString.decode(['hello', 'world']);
  expectToBeLeft(result);
  expect(result.left[0].message).toMatch('Too many arguments provided');
});
