import { composedType } from './composedType';
import * as t from 'io-ts';
import { expectToBeLeft, expectToBeRight } from './jest-fp-ts';

it('combines all the errors', () => {
  const value = composedType({
    name: t.string,
    age: t.number,
  })({
    name: 'hello',
    age: 'hello',
  });

  expectToBeLeft(value);
  expect(value.left.name).toHaveLength(0);
  expect(value.left.age).toHaveLength(1);
});

it('decodes the value', () => {
  const value = composedType({
    name: t.string,
    age: t.number,
  })({
    name: 'hello',
    age: 10,
  });

  expectToBeRight(value);
  expect(value.right).toEqual({ name: 'hello', age: 10 });
});
