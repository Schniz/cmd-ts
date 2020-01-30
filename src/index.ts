import { either, Either, Right } from 'fp-ts/lib/Either';
import { inspect } from 'util';
import chalk from 'chalk';
import * as t from 'io-ts';
import camelCase from 'lodash.camelcase';
import kebabCase from 'lodash.kebabcase';

type FromStr<T = any> = t.Type<T, string, unknown>;
type FromStrArray<T = any> = t.Type<T, string[], unknown>;
const INTERNAL_CLI_ARGS_NAME = 'cli args';
type ParsedItem =
  | { type: 'namedBooleanArg'; inputKey: string; key: string }
  | { type: 'positional'; input: string }
  | { type: 'forcePositional'; input: string }
  | {
      type: 'namedArgument';
      inputKey: string;
      inputValue: string;
      key: string;
    };

type ParseError = { validationErrors: t.Errors; parsed: ParsedItem[] };

function intermediateTuple<T extends FromStr>(
  decoder: T
): t.Type<T, [string], unknown> {
  const tupleT = t.array(decoder);
  return new t.Type(
    decoder.name,
    function is(obj): obj is [t.TypeOf<T>] {
      return tupleT.is(obj) && obj.length === 1;
    },
    function validate(obj, context): Either<t.Errors, T['_A']> {
      if (obj === undefined) {
        return decoder.validate(obj, context);
      }

      if (!Array.isArray(obj)) {
        return t.failure(obj, context, 'Malformed data received');
      }

      if (obj.length > 1) {
        return t.failure(
          obj,
          context,
          `Too many arguments provided (${obj.length} for 1)`
        );
      }

      return decoder.validate(obj[0], context);
    },
    function encode(_val) {
      throw new Error('WERA');
    }
  );
}

type Set<T extends {}, Key extends keyof T, Value> = {
  [key in keyof T | Key]: key extends Key ? Value : T[key];
};

function set<T, Key extends keyof T, Value>(
  t: T,
  key: Key,
  value: Value
): Set<T, Key, Value> {
  return { ...t, [key]: value } as any;
}

type OutputOfNamedArguments<CBO extends CommandBuilderOptions> = t.TypeOf<
  CBO['namedArguments']
>;

interface CommandBuilderOptions {
  name?: string;
  version?: string;
  namedArguments: t.Type<any>;
  // subcommands: CommandBuilderOptions[],
}

class CommandBuilder<
  Options extends CommandBuilderOptions = {
    name: string;
    version: string;
    namedArguments: t.Type<unknown>;
  }
> {
  private readonly options: Options;

  static empty = (name?: string, version?: string) =>
    new CommandBuilder({ name, version, namedArguments: t.unknown });

  constructor(options: Options) {
    this.options = options;
  }

  multiNamedArg<Name extends string, Type extends FromStrArray>(opts: {
    name: Name;
    type: Type;
  }) {
    return this.setNamedArg(opts);
  }

  private setNamedArg<Name extends string, Type extends FromStrArray>(opts: {
    name: Name;
    type: Type;
  }) {
    const ttt: Record<Name, Type> = { [opts.name]: opts.type } as any;
    const type = t.type(ttt, INTERNAL_CLI_ARGS_NAME);
    const intersection: t.IntersectionC<[Options["namedArguments"], typeof type]> = t.intersection([this.options.namedArguments, type], INTERNAL_CLI_ARGS_NAME);
    return new CommandBuilder(
      set(
        this.options,
        'namedArguments',
        intersection,
      )
    );
  }

  namedArg<Name extends string, Type extends FromStr>(opts: {
    name: Name;
    type: Type;
    defaultValue?: t.TypeOf<Type>;
  }): CommandBuilder<
    Set<
      Options,
      'namedArguments',
      t.IntersectionC<
        [Options['namedArguments'], t.TypeC<{ [key in Name]: Type }>]
      >
    >
  > {
    return this.multiNamedArg({
      name: opts.name,
      type: intermediateTuple(opts.type),
    }) as any;
  }

  parse(argv: string[]): Either<ParseError, OutputOfNamedArguments<Options>> {
    let index = 0;
    const parsed: ParsedItem[] = [];
    const positional = [];
    let straightIntoPositional = false;
    const objs: Record<string, string[]> = {};

    while (index < argv.length) {
      if (straightIntoPositional) {
        positional.push(argv[index]);
        parsed.push({ type: 'positional', input: argv[index] });
        index++;
        continue;
      }

      if (argv[index] === '--') {
        straightIntoPositional = true;
        parsed.push({ type: 'forcePositional', input: argv[index] });
        index++;
        continue;
      }

      if (argv[index].startsWith('--')) {
        const inputKey = argv[index];
        const key = camelCase(inputKey);
        index++;
        if (!objs[key]) {
          objs[key] = [];
        }

        const nextKey = argv[index];

        if (!nextKey || nextKey.startsWith('--')) {
          parsed.push({ type: 'namedBooleanArg', inputKey, key });
          objs[key].push('true');
        } else {
          parsed.push({
            type: 'namedArgument',
            inputKey,
            key,
            inputValue: nextKey,
          });
          objs[key].push(nextKey);
          index++;
        }
        continue;
      } else {
        positional.push(argv[index]);
        parsed.push({ type: 'positional', input: argv[index] });
        index++;
        continue;
      }
    }

    return either.mapLeft(
      this.options.namedArguments.decode(objs),
      validationErrors => {
        return { validationErrors, parsed: parsed };
      }
    );
  }
}

export function program(name?: string, version?: string) {
  return CommandBuilder.empty(name, version);
}

// const p = program()
//   .namedArg({ name: 'gal', type: t.string })
//   .namedArg({ name: 'numberWeWant', type: IntOfStr })
//   .multiNamedArg({ name: 'multipleNumbers', type: t.array(IntOfStr) })
//   .namedArg({ name: 'date', type: DateFromISOString })
//   .namedArg({ name: 'stream', type: ReadStream });
// const result = p.parse(process.argv);

export function ensureCliSuccess<T>(
  result: Either<ParseError, T>
): asserts result is Right<T> {
  if (result._tag === 'Right') return;

  for (const error of result.left.validationErrors) {
    const message = error.message ?? 'No message provided.';
    const errs = error.context.filter(
      x => x.type.name !== INTERNAL_CLI_ARGS_NAME
    );
    const key = errs.map(x => kebabCase(x.key)).join('.');
    const err = errs.slice(-1)[0];
    console.error(
      chalk.red(`Can't parse value for`),
      chalk.red(`${chalk.italic.underline(key)}:`),
      chalk.yellow(message),
      chalk.yellow.dim(
        err.actual === undefined
          ? '(no value provided either.)'
          : `(values provided: ${inspect(err.actual)}.)`
      )
    );
  }

  const colors = [
    chalk.green,
    chalk.cyan,
    chalk.yellow,
    chalk.magenta,
    chalk.blue,
  ];

  const formattedParsed = result.left.parsed.map((parsed, i): string => {
    const color = colors[i % colors.length];
    switch (parsed.type) {
      case 'forcePositional':
        return color(parsed.input);
      case 'namedArgument':
        return color(chalk.italic(parsed.inputKey) + ' ' + parsed.inputValue);
      case 'positional':
        return color.dim(parsed.input);
      case 'namedBooleanArg':
        return color.italic(parsed.inputKey);
    }
  });

  console.error(formattedParsed.join(' '));

  process.exit(1);
}

// reportCliResultIfError(result);

// result.right.stream.pipe(process.stdout);
