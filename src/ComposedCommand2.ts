import * as t from 'io-ts';
import { NormalizedMinimist } from './normalMinimist';
import { either } from 'fp-ts/lib/Either';
import { Parser, Into } from './Parser';
import {ParsingContext} from './ParsingContext';

type SubcommandResult<Name extends string, Args> = { command: Name; args: Args };

function composedCommandType<Name extends string, P extends Parser<any>>(
  name: Name,
  parser: P
) {
  const minimist = t.type({
    positional: t.tuple([t.literal(name)]),
    named: t.any,
  });
  return new t.Type<
    SubcommandResult<Name, Into<P>>,
    NormalizedMinimist,
    unknown
  >(
    'n',
    (_x: unknown): _x is SubcommandResult<Name, Into<P>> => true,
    (obj, ctx) => {
      return either.chain(minimist.validate(obj, ctx), validated => {
        console.log({ validated })
        return either.map(
          parser
            .type()
            .validate(
              {
                positional: validated.positional.slice(1),
                named: validated.named,
              },
              ctx
            ),
          args => {
            return { command: validated.positional[0], args };
          }
        );
      });
    },
    _ => {
      throw new Error('irreversible');
    }
  );
}

export class ComposedCommand<T extends t.Any> implements Parser<t.TypeOf<T>> {
  type_: T;

  constructor(t: T) {
    this.type_ = t;
  }

  type() {
    return this.type_;
  }

  parse(mmst: NormalizedMinimist, context = new ParsingContext()) {
    return either.mapLeft(this.type_.decode(mmst), validationErrors => {
      return { validationErrors, context, parsed: mmst };
    });
  }

  static new<Name extends string, P extends Parser<any>>(
    name: Name,
    parser: P
  ) {
    return new ComposedCommand(composedCommandType(name, parser));
  }

  subcommand<Name extends string, P extends Parser<any>>(
    name: Name,
    parser: P
  ) {
    return new ComposedCommand(
      t.union([this.type_, composedCommandType(name, parser)])
    );
  }
}
