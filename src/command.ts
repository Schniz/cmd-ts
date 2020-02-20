import { tupleWithOneElement } from './tupleWithOneElement';
import { Either, either } from 'fp-ts/lib/Either';
import chalk from 'chalk';
import { padNoAnsi, unimplemented } from './utils';
import stripAnsi from 'strip-ansi';
import * as t from 'io-ts';
import {
  minimist,
  MinimistResult,
  MinimistNamedArguments,
  ParseItem,
} from './minimist';
import kebabCase from 'lodash.kebabcase';
import {
  composedType,
  ComposedType,
  TypeRecord,
  TROutput,
  TRErrors,
} from './composedType';
import { withMessage } from 'io-ts-types/lib/withMessage';
import { BooleanFromString } from './BooleanFromString';

/** A string */
export const string = withMessage(
  t.string,
  () => `Provided value is not a string`
);

/**
 * Create a new type from string
 *
 * This is a handy utility to create a new `t.Type` without providing
 * details that aren't necessary for the two-way conversions: `clio-ts`
 * is only using a `string => T` conversion, while `io-ts` supports two sided
 * conversions: `string <=> T`. This is unnecessary and adds complexity, so this
 * tiny handler helps with providing defaults and `unimplemented` calls when necessary.
 */
export function fromStr<Output = unknown>(
  validator: t.Validate<string, Output>
): t.Type<Output, string> {
  return new t.Type<Output, string>(
    'CustomValidator',
    (_x): _x is Output => false,
    (obj, ctx) => {
      return either.chain(string.validate(obj, ctx), s => validator(s, ctx));
    },
    unimplemented
  );
}

/**
 * A boolean argument, parses a string into a boolean:
 *
 * * `'true'` => true
 * * `'false'` => false
 * * otherwise => fails
 */
export const bool = BooleanFromString;

/**
 * An optional argument type.
 *
 * @param decoder an `io-ts` decoder to make undefinedable.
 * @example
 *  ```ts
 *  const optionalString = optional(t.string);
 *  ```
 */
export function optional<T extends t.Any>(decoder: T) {
  return t.union([t.undefined, decoder]);
}

/**
 * A command line argument parser
 */
export type Parser<Into = unknown> = {
  parse(
    argv: string[],
    context?: ParseItem[]
  ): Either<ParseError<TypeRecord>, Into>;
};

/**
 * A named argument (`--long {value}` for the long names or `-s {value}` as short)
 */
export type NamedArgument = {
  kind: 'named';
  /**
   * An `io-ts` decoder to be used for parsing the values.
   *
   * By default, the type expected to be able to parse from a list of strings,
   * so users will be able to write command line applications with multiple
   * named arguments with the same name: `--value=hello --value=world`.
   *
   * To allow only one value, use the [[single]] combinator that turns a decoder from string
   * to a decoder of a list of strings.
   */
  type: t.Type<any, string[]>;
  /**
   * A short (one-letter) name to be used. For instance, providing `s` would result in
   * allowing the user to pass `-s value`
   */
  short?: string;
  /**
   * A long name to be used. For instance, providing `long-name` would result in
   * allowing the user to pass `--long-name value`
   */
  long?: string;
  /**
   * A display name for the value, when showing help. For instance, when providing "hello",
   * it would result as `--long-name <hello>`
   */
  argumentName?: string;
  /**
   * An environment variable name to take as default, if given
   */
  env?: string;
  /**
   * A description to be provided when showing help
   */
  description?: string;
  /**
   * A default value, when no value is given
   */
  defaultValue?: string;
};

/**
 * A boolean argument (`--long` for long booleans, `-s` for short booleans)
 */
export type BooleanArgument = {
  kind: 'boolean';
  /**
   * An `io-ts` decoder to be used for parsing the values.
   *
   * By default, the type expected to be able to parse from a list of strings,
   * so users will be able to write command line applications with multiple
   * named arguments with the same name: `--value=hello --value=world`.
   *
   * To allow only one value, use the [[single]] combinator that turns a decoder from string
   * to a decoder of a list of strings.
   */
  type: t.Type<any, string[]>;
  /**
   * A short (one-letter) name to be used. For instance, providing `s` would result in
   * allowing the user to pass `-s`
   */
  short?: string;
  /**
   * A long name to be used. For instance, providing `long-name` would result in
   * allowing the user to pass `--long-name`
   */
  long?: string;
  /**
   * A description to be provided when showing help
   */
  description?: string;
  /**
   * A default value, when missing
   */
  defaultValue?: boolean;
};

/**
 * A positional argument
 */
export type PositionalArgument = {
  kind: 'positional';
  /**
   * A type to parse from the string
   */
  type: t.Type<any, string>;
  /**
   * A display name for the argument. If missing, inferred from the given type
   */
  displayName?: string;
  /**
   * A description to be provided when showing help
   */
  description?: string;
};

/**
 * An argument configuration
 */
export type Argument = PositionalArgument | NamedArgument | BooleanArgument;

/**
 * A command configurations. An object where the keys are the results of a successful parse
 * and the values are a parsable [[Argument]]
 */
type CommandConfig = Record<string, Argument>;

function getTypes<T extends CommandConfig>(
  t: T
): { [key in keyof T]: T[key]['type'] } {
  const x = {} as {
    [key in keyof T]: T[key]['type'] extends t.Type<infer Output, string>
      ? t.Type<Output, [string]>
      : T[key]['type'];
  };

  for (const [key, value] of Object.entries(t)) {
    if (value.kind === 'positional') {
      x[key as keyof T] = tupleWithOneElement(value.type) as any;
    } else {
      x[key as keyof T] = value.type as any;
    }
  }

  return x;
}

function minimistArguments<Config extends CommandConfig>(
  config: Config
): MinimistNamedArguments {
  const long: Record<string, string> = {};
  const short: Record<string, string> = {};
  const forceBoolean: Set<string> = new Set();
  const positional: string[] = [];

  for (const [argName, arg] of Object.entries(config)) {
    if (arg.kind === 'positional') {
      positional.push(argName);
    } else {
      const longName = arg.long ? arg.long : kebabCase(argName);
      long[longName] = argName;
      if (arg.short) {
        short[arg.short] = argName;
      }
      if (arg.kind === 'boolean') {
        forceBoolean.add(argName);
      }
    }
  }

  return { long, short, forceBoolean, positional };
}

/**
 * Creates a command line argument parser
 *
 * @param args the command arguments: an object where the keys are the names in your code
 * and the values are an [[Argument]]
 * @example
 * ```ts
 * const cmd = command({
 *   positional: { kind: 'positional', type: t.string },
 *   named: { kind: 'named', long: 'username', type: single(t.string), env: 'MY_APP_USER' },
 *   someBoolean: { kind: 'boolean', long: 'authenticate', short: 'a', type: bool }
 * });
 *
 * const { positional, named, someBoolean } = parse(cmd, process.argv.slice(2));
 * ```
 * @returns [[Parser]] which parses into an object where its keys are the same
 * as the keys provided into the `args` argument, and the values are the result of the types for each key.
 */
export function command<Config extends CommandConfig>(
  args: Config,
  description?: string
): Parser<TROutput<{ [key in keyof Config]: Config[key]['type'] }>> {
  const types = getTypes(args);
  const type = composedType(types);
  const minimistArgs = minimistArguments(args);
  const defaultValues: Record<string, string[]> = {};

  for (const [argName, argValue] of Object.entries(args)) {
    switch (argValue.kind) {
      case 'boolean': {
        defaultValues[argName] = [argValue.defaultValue?.toString() ?? 'false'];
        break;
      }
      case 'named': {
        const env = argValue.env ? process.env[argValue.env] : undefined;
        const defaultValue = env ?? argValue.defaultValue;
        if (defaultValue) {
          defaultValues[argName] = [defaultValue];
        } else {
          defaultValues[argName] = [];
        }
        break;
      }
    }
  }

  type Types = typeof types;

  function showHelp(context: ParseItem[]): never {
    const argsSoFar = contextToString(context);

    console.log(`\`${argsSoFar}\``);
    console.log();

    if (description) {
      console.log(description);
      console.log();
    }

    if (Object.keys(args).length > 0) {
      console.log('Use the following arguments:');
      console.log();
    }

    for (const [argName, argValue] of Object.entries(args)) {
      const description = argValue.description
        ? ` - ${argValue.description}`
        : '';
      switch (argValue.kind) {
        case 'positional': {
          const explain = chalk.dim('(positional)');
          const displayName = argValue.displayName ?? argValue.type.name;
          console.log(`  <${displayName}>${description} ${explain}`.trimEnd());
          break;
        }
        case 'boolean': {
          const explain = chalk.dim('(takes no args)');
          console.log(
            `  --${argValue.long ??
              kebabCase(argName)}${description} ${explain}`.trimEnd()
          );
          break;
        }
        case 'named': {
          const env = argValue.env
            ? chalk.dim(`[env: ${argValue.env}=${process.env[argValue.env]}]`)
            : '';
          const defaultValue = argValue.defaultValue
            ? chalk.dim(`[default: ${argValue.defaultValue}]`)
            : '';
          const valueDisplayName = argValue.argumentName ?? argValue.type.name;
          const argDisplayName = argValue.long ?? kebabCase(argName);
          const trailing = [description, defaultValue, env]
            .filter(Boolean)
            .join(' ');
          console.log(
            `  --${argDisplayName} <${valueDisplayName}> ${trailing}`.trimEnd()
          );
        }
      }
    }

    console.log();

    process.exit(1);
  }

  type CommandOutput<TR extends TypeRecord> = TROutput<TR> & { _: string[] };

  function decodeMmst<TR extends TypeRecord>(
    mmst: MinimistResult,
    namedArgDecoder: ComposedType<TR>
  ): Either<ParseError<TR>, CommandOutput<TR>> {
    const result = either.map(namedArgDecoder(mmst.named), named => ({
      ...named,
      _: mmst.positional,
    }));
    return either.mapLeft(result, errors => {
      return { parsed: mmst, errors, commandConfig: args };
    });
  }

  function parse(
    argv: string[],
    context: ParseItem[] = []
  ): Either<ParseError<Types>, CommandOutput<Types>> {
    const mmst = minimist(argv, minimistArgs);
    mmst.named = Object.assign({}, defaultValues, mmst.named);
    if (mmst.named['h'] || mmst.named['help']) {
      showHelp(context);
    }

    return either.mapLeft(decodeMmst(mmst, type), errors => {
      return {
        ...errors,
        parsed: {
          ...errors.parsed,
          context: [...context, ...errors.parsed.context],
        },
      };
    });
  }

  return { parse };
}

type ParseError<TR extends TypeRecord> = {
  parsed: MinimistResult;
  errors: TRErrors<TR>;
  commandConfig: CommandConfig;
};

const colorCycle = [
  chalk.green,
  chalk.blue,
  chalk.magenta,
  chalk.cyan,
  chalk.white,
];
const getColor = (() => {
  let i = 0;
  return () => colorCycle[i++ % colorCycle.length];
})();

function prettyFormat<TR extends TypeRecord>(parseError: ParseError<TR>) {
  const namedErrors = { ...parseError.errors };

  const rows: [chalk.Chalk, string, string][] = [];
  const items: string[] = [];

  for (const parseItem of parseError.parsed.context) {
    switch (parseItem.type) {
      case 'forcePositional': {
        rows.push([chalk.dim, '--', '']);
        items.push(chalk.dim('--'));
        break;
      }
      case 'positional': {
        if (parseItem.hide) {
          continue;
        }

        let color = getColor();

        if (parseItem.name) {
          const errors = namedErrors?.[parseItem.name as keyof TR];
          const arg = `<${parseItem.name}=${parseItem.input}>`;
          const mainError = errors?.[0];
          const mainErrorMessage = mainError
            ? mainError.message ?? 'No message given'
            : '';
          color = mainError ? chalk.red : color;
          rows.push([color, arg, mainErrorMessage]);
          delete namedErrors[parseItem.name];
        } else {
          rows.push([color, `<${parseItem.input}>`, '']);
        }

        items.push(color(parseItem.input));
        break;
      }
      case 'namedArgument': {
        const errors = namedErrors?.[parseItem.key as keyof TR];
        const value = parseItem.inputValue
          ? chalk.bold(parseItem.inputValue)
          : '';
        const arg = `${chalk.italic(parseItem.inputKey)} ${value}`.trim();
        const mainError = errors?.splice(0, 1)?.[0];
        const mainErrorMessage = mainError
          ? mainError.message ?? 'No message given'
          : '';
        const color = mainError ? chalk.red : getColor();
        rows.push([color, arg, mainErrorMessage]);

        const inputKey = chalk.italic(parseItem.inputKey);
        const inputValue = parseItem.inputValue ?? '';
        items.push(color(`${inputKey} ${inputValue}`.trim()));
      }
    }
  }

  for (const [name, value] of Object.entries(namedErrors)) {
    if (value.length > 0) {
      const err = value[0];
      const message =
        err.message ??
        (err.value === undefined ? 'no value provided' : 'no message provided');
      rows.push([chalk.red, chalk.italic(name), message]);
    }
  }

  console.error(chalk.red(`Can't run the requested command.`));
  console.error();
  console.error(chalk.yellow('Input:'));

  console.error('  ' + items.join(' '));
  console.error();

  console.error(chalk.yellow('Parsed:'));

  const longestA = rows.reduce(
    (a, b) => Math.max(a, stripAnsi(b[1]).length),
    0
  );

  for (const [color, a, b] of rows) {
    const aa = padNoAnsi(a, longestA + 2, 'start');
    console.error(color(`${aa}  ${b}`.trimEnd()));
  }

  const currentCmd = stripAnsi(contextToString(parseError.parsed.context));
  console.error();
  console.error(
    chalk.red(`Try running \`${currentCmd} --help\` to learn more`)
  );
}

/**
 * Returns the value a parser resolves into
 */
export type Into<P extends Parser<any>> = P extends Parser<infer Into>
  ? Into
  : never;

type SubcommandResult<Config extends Record<string, Parser<any>>> = {
  [key in keyof Config]: { command: key; args: Into<Config[key]> };
} extends infer X
  ? X[keyof X]
  : never;

/**
 * Lifts a parser (`command` or `subcommands`) into a binary parser
 * that can take a complete `process.argv` without slicing
 *
 * @example
 * ```ts
 * const cmd = command({ ... });
 * const binary = binaryParser(cmd, 'my-app');
 * const result = parse(binary, process.argv);
 * ```
 */
export function binaryParser<P extends Parser<any>>(
  p: P,
  binaryName?: string
): Parser<Into<P>> {
  function parse(argv: string[], context: ParseItem[] = []) {
    const [, _binaryName, ...args] = argv;
    const newContext: ParseItem[] = [
      ...context,
      {
        type: 'positional',
        hide: true,
        position: 0,
        input: binaryName ?? _binaryName,
        name: 'binaryName',
        forced: false,
      },
    ];
    return p.parse(args, newContext);
  }

  return { parse };
}

function contextToString(ctx: ParseItem[]): string {
  const getColor = (() => {
    let i = 0;
    return () => colorCycle[i++ % colorCycle.length];
  })();

  let parts: string[] = [];
  for (const item of ctx) {
    switch (item.type) {
      case 'positional': {
        parts.push(item.input);
        break;
      }
      case 'namedArgument': {
        parts.push(`${item.inputKey} ${item.inputValue}`);
        break;
      }
      case 'forcePositional': {
        parts.push('--');
        break;
      }
    }
  }
  return parts.map(x => getColor()(x)).join(' ');
}

/**
 * Creates a subcommand selection in order to compose multiple commands into one
 *
 * @example
 * ```ts
 * const install = command({ ... });
 * const uninstall = command({ ... });
 * const cli = subcommands({ install, uninstall });
 * const { command, args } = parse(cli, process.argv.slice(2));
 * ```
 */
export function subcommands<Config extends Record<string, Parser<any>>>(
  config: Config,
  description?: string
): Parser<SubcommandResult<Config>> {
  const cmdNames = Object.keys(config);
  const literals = cmdNames.map(x => t.literal(x));
  const type: t.Type<keyof Config | '--help' | '-h', string> = withMessage(
    t.union([t.literal('--help'), t.literal('-h'), t.union(literals as any)]),
    () => {
      return `Not a valid command. Must be one of: ${cmdNames}`;
    }
  );

  function showHelp(context: ParseItem[]): never {
    const argsSoFar = contextToString(context);

    console.log(argsSoFar + chalk.italic(' <subcommand>'));
    console.log();

    if (description) {
      console.log(description);
      console.log();
    }

    console.log(`${chalk.italic('<subcommand>')} can be one of:`);
    console.log();

    for (const key of cmdNames) {
      console.log(chalk.dim('- ') + key);
    }

    const helpCommand = `${stripAnsi(argsSoFar)} <subcommand> --help`;

    console.log();
    console.log(chalk.dim(`For more help, try running \`${helpCommand}\``));

    process.exit(1);
  }

  function parse(
    argv: string[],
    context: ParseItem[] = []
  ): Either<ParseError<TypeRecord>, SubcommandResult<Config>> {
    const [commandName, ...args] = argv;

    if (commandName === '--help' || commandName === '-h' || !commandName) {
      showHelp(context);
    }

    const position = context.map(x => x.type === 'positional').length;
    const key = `subcommand${position}`;

    const newContext: ParseItem[] = [
      ...context,
      {
        type: 'positional',
        hide: true,
        name: key,
        input: commandName,
        position,
        forced: false,
      },
    ];
    const command = either.mapLeft(
      type.decode(commandName),
      (errors): ParseError<TypeRecord> => {
        return {
          errors: { [key]: errors },
          parsed: {
            positional: [],
            named: {
              [key]: [commandName],
            },
            context: newContext,
          },
          commandConfig: {},
        };
      }
    );
    return either.chain(command, cmdName => {
      return either.map(config[cmdName].parse(args, newContext), result => {
        return { command: cmdName, args: result } as SubcommandResult<Config>;
      });
    });
  }

  return { parse };
}

/**
 * Parse arguments and exit on errors
 *
 * @param parser The command to parse with
 * @param args String arguments to pass to the command
 * @example
 * ```ts
 * const mycommand = command({ name: { kind: 'positional', type: t.string });
 * const { name, _ } = parse(mycommand, ['hello', 'world']);
 * console.log(name); // => "hello"
 * console.log(_); // => ["world"]
 * ```
 */
export function parse<P extends Parser<any>>(
  parser: P,
  args: string[]
): Into<P> {
  const result = parser.parse(args);
  if (result._tag === 'Right') return result.right;
  prettyFormat(result.left);
  process.exit(1);
}

/**
 * Ensures that there's only one value provided for the argument.
 *
 * Takes an `io-ts` decoder that parses `A => B` and returns a decoder that parses `A[] => B`
 * and fails if there are more or less than one item.
 */
export const single = tupleWithOneElement;
