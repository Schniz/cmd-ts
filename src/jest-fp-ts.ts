import { Either, Right, Left } from 'fp-ts/lib/Either';

export function expectToBeRight(v: Either<any, any>): asserts v is Right<any> {
  expect(v._tag).toBe('Right');
}

export function expectToBeLeft(v: Either<any, any>): asserts v is Left<any> {
  expect(v._tag).toBe('Left');
}
