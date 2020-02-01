import { array } from 'fp-ts/lib/Array';
import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';

type FromStr<T extends any = any> = t.Type<T, string, unknown>;
// type FromStrArray<T extends any = any> = t.Type<T, string[], unknown>;

type OutputOf<Types extends FromStr[]> = {
  matched: {
    [key in keyof Types]: t.TypeOf<Extract<Types[key], t.Any>>;
  };
  rest: string[];
};

type OutputType<InputTypes extends FromStr[]> = t.Type<
  OutputOf<InputTypes>,
  string[],
  string[]
>;

// TODO: need to test it because I use `any`!
export function positionalArgType(positionas: []): OutputType<[]>;
export function positionalArgType<A extends FromStr>(
  positionas: [A]
): OutputType<[A]>;
export function positionalArgType<A extends FromStr, B extends FromStr>(
  positionas: [A, B]
): OutputType<[A, B]>;
export function positionalArgType<
  A extends FromStr,
  B extends FromStr,
  C extends FromStr
>(positionas: [A, B, C]): OutputType<[A, B, C]>;
export function positionalArgType<Types extends FromStr[]>(
  positionals: Types
): OutputType<Types> {
  return new t.Type<OutputOf<Types>, string[], string[]>(
    'positional',
    (_x: unknown): _x is OutputOf<Types> => false,
    (obj, ctx) => {
      const eithers = positionals.map((x, i) => x.validate(obj[i], ctx));
      const rest = obj.slice(positionals.length);
      return either.map(array.sequence(either)(eithers), matched => {
        return { matched, rest } as any;
      });
    },
    _ => {
      throw 'unimplemented';
    }
  );
}
