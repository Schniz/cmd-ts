import { tupleWithOneElement } from './tupleWithOneElement';
import { Either, either, Right } from 'fp-ts/lib/Either';
import chalk from 'chalk';
import { padNoAnsi } from './utils';
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

export const bool = BooleanFromString;

export function optional<T extends t.Mixed>(decoder: T) {
  return t.union([t.undefined, decoder]);
}

type Parser<Into = unknown> = {
  parse(
    argv: string[],
    context?: ParseItem[]
  ): Either<ParseError<TypeRecord>, Into>;
};

type NamedArgument = {
  kind: 'named';
  type: t.Type<any, string[]>;
  short?: string;
  long?: string;
  argumentName?: string;
  env?: string;
  description?: string;
  defaultValue?: string;
};

type BooleanArgument = {
  kind: 'boolean';
  type: t.Type<any, ('true' | 'false')[]>;
  short?: string;
  long?: string;
  description?: string;
  defaultValue?: boolean;
};

type PositionalArgument = {
  kind: 'positional';
  type: t.Type<any, string>;
  displayName?: string;
  description?: string;
};

type Argument = PositionalArgument | NamedArgument | BooleanArgument;

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

export function command<Config extends CommandConfig>(
  config: Config,
  description?: string
) {
  const types = getTypes(config);
  const type = composedType(types);
  const minimistArgs = minimistArguments(config);
  const defaultValues: Record<string, string[]> = {};

  for (const [argName, argValue] of Object.entries(config)) {
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

    if (Object.keys(config).length > 0) {
      console.log('Use the following arguments:');
      console.log();
    }

    for (const [argName, argValue] of Object.entries(config)) {
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

  function parse(
    argv: string[],
    context: ParseItem[] = []
  ): Either<ParseError<Types>, [TROutput<Types>, string[]]> {
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

  return { parse, config };
}

type ParseError<TR extends TypeRecord> = {
  parsed: MinimistResult;
  errors: TRErrors<TR>;
};

function decodeMmst<TR extends TypeRecord>(
  mmst: MinimistResult,
  namedArgDecoder: ComposedType<TR>
): Either<ParseError<TR>, [TROutput<TR>, string[]]> {
  type Result = [TROutput<TR>, string[]];
  const result = either.map(
    namedArgDecoder(mmst.named),
    named => [named, mmst.positional] as Result
  );
  return either.mapLeft(result, errors => {
    return { parsed: mmst, errors };
  });
}

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
        console.log({ key: parseItem.key, errors });
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

type Into<P extends Parser<any>> = P extends Parser<infer Into> ? Into : never;

type SubcommandResult<Config extends Record<string, Parser<any>>> = {
  [key in keyof Config]: { command: key; args: Into<Config[key]> };
} extends infer X
  ? X[keyof X]
  : never;

export function binaryParser<P extends Parser<any>>(
  p: P,
  binaryName?: string
): Parser<Into<P>> {
  function parse(argv: string[], context: ParseItem[] = []) {
    const [, _binaryName, ...args] = argv;
    const newContext: ParseItem[] = [
      ...context,
      // {
      //   type: 'positional',
      //   position: 0,
      //   input: 'node',
      //   forced: false,
      // },
      {
        type: 'positional',
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
 * Pretty-print errors and exit with exit code 1 on error,
 * otherwise, continue.
 */
export function ensureCliSuccess(
  cliResult: Either<ParseError<any>, any>
): asserts cliResult is Right<any> {
  if (cliResult._tag === 'Right') return;
  prettyFormat(cliResult.left);
  process.exit(1);
}

/**
 * Parse arguments and exit on errors
 *
 * @param parser The command to parse with
 * @param args String arguments to pass to the command
 */
export function parse<P extends Parser<any>>(
  parser: P,
  args: string[]
): Into<P> {
  const result = parser.parse(args);
  ensureCliSuccess(result);
  return result.right;
}

export const single = tupleWithOneElement;
