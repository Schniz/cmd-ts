import * as t from 'io-ts';
import { tupleWithOneElement } from './tupleWithOneElement';
import { IntOfStr } from './example/test-types';
import { either, Either, Right } from 'fp-ts/lib/Either';
import kebabCase from 'lodash.kebabcase';
import { clone } from 'io-ts-types/lib/clone';
import { minimist } from './minimist';
// import { ensureCliSuccess } from './ensureCliSuccess';

type ParseError = {
  namedArgsErrors: t.Errors;
  positionalErrors: t.Errors;
  parsed: MinimistResult;
};

function withName<T extends t.Any>(decoder: T, name: string): T {
  const cloned = clone(decoder);
  (cloned as any).name = name;
  return cloned;
}

type FromStrArray<T extends any = any> = t.Type<T, string[], unknown>;
type FromStr<T extends any = any> = t.Type<T, string, unknown>;

type NamedArg<T extends FromStrArray = FromStrArray> = {
  long: string;
  short?: string;
  type: T;
  description: string;
  env?: string;
};

function getTypes<T extends Record<string, NamedArg>>(
  t: T
): { [key in keyof T]: T[key]['type'] } {
  const x = {} as { [key in keyof T]: T[key]['type'] };

  for (const [key, value] of Object.entries(t)) {
    x[key as keyof T] = value.type;
  }

  return x;
}

type PositionalArg<T extends FromStr = FromStr> = T & {
  description?: string;
  name: string;
};

function combineValidation<A, B>(
  e1: Either<t.Errors, A>,
  e2: Either<t.Errors, B>
): Either<[t.Errors, t.Errors], [A, B]> {
  if (e1._tag === 'Left' && e2._tag === 'Left') {
    return either.throwError([e1.left, e2.left]);
  } else if (e1._tag === 'Left') {
    return either.throwError([e1.left, []]);
  } else if (e2._tag === 'Left') {
    return either.throwError([e2.left, []]);
  } else {
    return either.of([e1.right, e2.right]);
  }
}

function command<
  NamedArgs extends Record<string, NamedArg>,
  Positional extends t.TupleType<PositionalArg[]>
>(named: NamedArgs, positional: Positional) {
  const namedType = t.type(getTypes(named), INTERNAL_CLI_ARGS_NAME);

  function parse(
    args: MinimistResult
  ): Either<ParseError, [t.TypeOf<typeof namedType>, t.TypeOf<Positional>]> {
    const parsedNamed = namedType.decode(args.named);
    const parsedPositional = positional.decode(args.positional);

    return either.mapLeft(
      combineValidation(parsedNamed, parsedPositional),
      ([namedArgsErrors, positionalErrors]) => {
        return { namedArgsErrors, positionalErrors, parsed: args };
      }
    );
  }

  function help() {
    for (const [key, { description, type }] of Object.entries(named)) {
      console.log(`--${kebabCase(key)} <${type.name}> - ${description}`);
    }

    for (const pos of positional.types) {
      console.log(`<${pos.name}> - ${pos.description}`);
    }
  }

  function parseArr(argv: string[]) {
    let long: Record<string, string> = {};
    let short: Record<string, string> = {};

    for (const [key, value] of Object.entries(named)) {
      long[value.long] = key;
      if (value.short) {
        short[value.short] = key;
      }
    }

    const mmst = minimist(argv, {
      short,
      long,
      forceBoolean: new Set(),
      positionalNames: positional.types.map(x => x.name),
    });
    return parse(mmst);
  }

  return {
    parse,
    help,
    parseArr,
  };
}

function pos<T extends FromStr>(opts: { name: string; type: T }) {
  return withName(opts.type, opts.name);
}

function prettyPrintErrors(
  e: Either<ParseError, any>
): asserts e is Right<any> {
  if (e._tag === 'Right') return;

  const { namedArgsErrors, positionalErrors, parsed } = e.left;
  const errorMessagesForNamed: Record<string, string[]> = {};
  const errorMessagesForPositional: Record<string, string[]> = {};

  for (const error of namedArgsErrors) {
    const ctx = error.context.filter(
      x => x.type.name !== INTERNAL_CLI_ARGS_NAME
    );
    const prop = ctx[0];
    errorMessagesForNamed[prop.key] = (
      errorMessagesForNamed[prop.key] ?? []
    ).concat([error.message ?? 'No message provided']);
  }

  for (const error of positionalErrors) {
    const ctx = error.context.filter(
      x => x.type.name !== INTERNAL_CLI_ARGS_NAME
    );
    const prop = ctx[0];
    errorMessagesForPositional[prop.key] = (
      errorMessagesForPositional[prop.key] ?? []
    ).concat([error.message ?? 'No message provided']);
  }

  for (const parsedItem of parsed.context) {
    switch (parsedItem.type) {
      case 'positional': {
        const errorMessage =
          errorMessagesForPositional[parsedItem.position] ?? [];
        if (errorMessage.length === 0) {
          console.error(chalk.green(parsedItem.input));
        } else {
          console.error(
            chalk.red.bold(parsedItem.input) + ' ' + chalk.red(errorMessage)
          );
          delete errorMessagesForPositional[parsedItem.position];
        }
        break;
      }
      case 'forcePositional': {
        console.error(chalk.dim('--'));
        break;
      }
      case 'namedArgument': {
        const inputValue = parsedItem.inputValue
          ? chalk.bold(parsedItem.inputValue)
          : '';
        const together = `${parsedItem.inputKey} ${inputValue}`.trim();
        const errorMessage = errorMessagesForNamed[parsedItem.key] ?? [];
        if (errorMessage.length === 0) {
          console.error(chalk.green(together));
        } else {
          console.error(
            chalk.red.italic(together) + ' ' + chalk.red(errorMessage)
          );
          delete errorMessagesForNamed[parsedItem.key];
        }
        break;
      }
      case 'missingPositional': {
        console.error(chalk.red(`<${parsedItem.name}: missing>`));
      }
    }
  }

  const leftoverNamedErrors = Object.entries(errorMessagesForNamed);
  if (leftoverNamedErrors.length > 0) {
    console.error(chalk.red(`The following named arguments were missing:`));
    for (const [key, value] of leftoverNamedErrors) {
      console.error(chalk.red(`  ${key} ${value}`));
    }
  }

  process.exit(1);
}

const cmd = command(
  {
    hello: {
      long: 'hello',
      description: 'Hello world!',
      type: tupleWithOneElement(t.string),
    },
    numbers: {
      long: 'number',
      short: 'n',
      description: 'Hello world!',
      type: t.array(IntOfStr),
    },
  },
  t.tuple(
    [
      pos({ type: t.string, name: 'name' }),
      pos({ type: IntOfStr, name: 'age' }),
    ],
    INTERNAL_CLI_ARGS_NAME
  )
);

const y = cmd.parseArr(process.argv.slice(2));
// import { ThrowReporter } from 'io-ts/lib/ThrowReporter';
import { INTERNAL_CLI_ARGS_NAME } from './utils';
import { MinimistResult } from './minimist';
import chalk from 'chalk';
// ThrowReporter.report(y);
prettyPrintErrors(y);
console.log(y.right);
