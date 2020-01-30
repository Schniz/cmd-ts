import * as t from 'io-ts';
import { Either, either } from 'fp-ts/lib/Either';
import { NormalizedMinimist } from './normalMinimist';
import { assign } from './assign';
import { ParseError, Parser, Into } from './Parser';
import { ParsingContext } from './ParsingContext';

type StoredSubcommand<
  Name extends string = string,
  Cmd extends Parser<any> = Parser<any>
> = { name: Name; parser: Cmd };

type AllOptionsOf<Subcommands extends Record<string, StoredSubcommand>> = {
  [key in keyof Subcommands]: {
    command: key;
    parsed: Into<Subcommands[key]['parser']>;
  };
} extends infer R
  ? R[keyof R]
  : never;

function keysType<T extends { [key: string]: any }>(
  rootObject: T
): t.Type<keyof T, string, unknown> {
  return new t.Type<keyof T, string, unknown>(
    'subcommand',
    (x): x is keyof T =>
      typeof x === 'string' && (rootObject as Object).hasOwnProperty(x),
    (obj, ctx) => {
      if (typeof obj !== 'string') {
        return t.failure(obj, ctx, 'Value is not a string');
      }

      const allProperties = Object.getOwnPropertyNames(rootObject);

      if (!(rootObject as Object).hasOwnProperty(obj)) {
        return t.failure(obj, ctx, 'available subcommands: ' + allProperties.join(", "));
      }

      return t.success(obj);
    },
    x => String(x)
  );
}

export class ComposedCommand<
  Subcommands extends Record<string, StoredSubcommand>
> implements Parser<AllOptionsOf<Subcommands>> {
  readonly subcommandParser: Subcommands;

  constructor(subcommandParser: Subcommands) {
    this.subcommandParser = subcommandParser;
  }

  subcommand<Cmd extends Parser<any>, Name extends string>(
    name: Name,
    parser: Cmd
  ) {
    const subcommands = assign(this.subcommandParser, name, { name, parser });
    return new ComposedCommand(subcommands);
  }

  static new<Name extends string, Cmd extends Parser<any>>(
    name: Name,
    command: Cmd
  ) {
    // const subcommand = newSubcommand(name, command);
    // return new ComposedCommand<SubcommandType<Name, Cmd>>(subcommand);
    return new ComposedCommand({}).subcommand(name, command);
  }

  keysType(): t.Type<keyof Subcommands> {
    return keysType(this.subcommandParser);
  }

  parse(
    args: NormalizedMinimist,
    context: ParsingContext = new ParsingContext()
  ): Either<ParseError, AllOptionsOf<Subcommands>> {
    const [commandName, ...positional] = args.positional;
    const subcommandArgs = { ...args, positional };
    const commandParsing = either.mapLeft(
      this.keysType().decode(commandName),
      validationErrors => {
        console.log(validationErrors[0].context);
        return { validationErrors, parsed: args, context };
      }
    );
    return either.chain(commandParsing, cmdName => {
      context.add({ type: 'subcommand', inputValue: commandName });
      const storedCommand = this.subcommandParser[cmdName];
      return either.map(
        storedCommand.parser.parse(subcommandArgs, context),
        parsed => {
          return { command: commandName, parsed } as AllOptionsOf<Subcommands>;
        }
      );
    });
  }
}
