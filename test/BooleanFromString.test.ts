import { BooleanFromString } from '../src/BooleanFromString';
import { expectToBeLeft, expectToBeRight } from './fp-ts-helpers';

it('fails on random string', () => {
  const result = BooleanFromString.decode('awesjiasd');
  expectToBeLeft(result);
});

it('fails on empty string', () => {
  const result = BooleanFromString.decode('');
  expectToBeLeft(result);
});

it(`parses a 'true' value`, () => {
  const result = BooleanFromString.decode('true');
  expectToBeRight(result);
  expect(result.right).toBe(true);
});

it(`parses a 'false' value`, () => {
  const result = BooleanFromString.decode('false');
  expectToBeRight(result);
  expect(result.right).toBe(false);
});

it(`fails on a number`, () => {
  const result = BooleanFromString.decode(1000);
  expectToBeLeft(result);
});
