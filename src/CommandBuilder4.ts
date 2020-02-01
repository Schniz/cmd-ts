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
};

type Argument =
  | {
      kind: 'positional';
      type: t.Type<any, string>;
      displayName?: string;
    }
  | NamedArgument
  | {
      kind: 'boolean';
      type: t.Type<any, ('true' | 'false')[]>;
      short?: string;
      long?: string;
    };

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

export function single<
  T extends Omit<NamedArgument, 'type'> & { type: t.Type<any, string> }
>(arg: T): NamedArgument {
  return {
    ...arg,
    type: tupleWithOneElement(arg.type),
  };
}

export function command<Config extends CommandConfig>(config: Config) {
  const types = getTypes(config);
  const type = composedType(types);
  const minimistArgs = minimistArguments(config);

  type Types = typeof types;

  function parse(
    argv: string[],
    context: ParseItem[] = []
  ): Either<ParseError<Types>, [TROutput<Types>, string[]]> {
    const mmst = minimist(argv, minimistArgs);
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
        const value = parseItem.inputValue
          ? chalk.bold(parseItem.inputValue)
          : '';
        const arg = `${chalk.italic(parseItem.inputKey)} ${value}`.trim();
        const mainError = errors?.splice(0, 1)?.[0];
        const mainErrorMessage = mainError
          ? mainError.message ?? 'No message given'
          : '';
        const color = mainError ? getColor() : chalk.green;
        rows.push([color, arg, mainErrorMessage]);

        const inputKey = chalk.italic(parseItem.inputKey);
        const inputValue = parseItem.inputValue ?? '';
        items.push(color(`${inputKey} ${inputValue}`.trim()));
      }
    }
  }

  for (const [name, value] of Object.entries(namedErrors)) {
    if (value.length > 0) {
      rows.push([chalk.red, chalk.italic(name), 'no value provided']);
    }
  }

  console.error(items.join(' '));

  const longestA = rows.reduce(
    (a, b) => Math.max(a, stripAnsi(b[1]).length),
    0
  );

  for (const [color, a, b] of rows) {
    const aa = padNoAnsi(a, longestA, 'start');
    console.error(color(`${aa}  ${b}`.trimEnd()));
  }
}

type Into<P extends Parser<any>> = P extends Parser<infer Into> ? Into : never;

type SubcommandResult<Config extends Record<string, Parser<any>>> = {
  [key in keyof Config]: { command: key; args: Into<Config[key]> };
} extends infer X
  ? X[keyof X]
  : never;

export function binaryParser<P extends Parser<any>>(p: P, binaryName?: string): Parser<Into<P>> {
  function parse(argv: string[], context: ParseItem[] = []) {
    const [, _binaryName, ...args] = argv;
    const newContext: ParseItem[] = [
      ...context,
      {
        type: 'positional',
        position: 0,
        input: "node",
        forced: false,
      },
      {
        type: 'positional',
        position: 1,
        input: binaryName ?? _binaryName,
        name: 'binaryName',
        forced: false,
      },
    ];
    return p.parse(args, newContext);
  }

  return { parse };
}

export function subcommands<Config extends Record<string, Parser<any>>>(
  config: Config
): Parser<SubcommandResult<Config>> {
  const cmdNames = Object.keys(config);
  const literals = cmdNames.map(x => t.literal(x));
  const type: t.Type<keyof Config, string> = withMessage(
    t.union(literals as any),
    () => {
      return `Not a valid command. Must be one of: ${cmdNames}`;
    }
  );

  function parse(
    argv: string[],
    context: ParseItem[] = [],
  ): Either<ParseError<TypeRecord>, SubcommandResult<Config>> {
    const [commandName, ...args] = argv;
    const newContext: ParseItem[] = [...context, {
      type: 'positional',
      name: 'subcommand',
      input: commandName,
      position: 0,
      forced: false,
    }];
    const command = either.mapLeft(
      type.decode(commandName),
      (errors): ParseError<TypeRecord> => {
        return {
          errors: { subcommand: errors },
          parsed: {
            positional: [],
            named: {
              subcommand: [commandName],
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

export function ensureCliSuccess(cliResult: Either<ParseError<any>, any>): asserts cliResult is Right<any> {
  if (cliResult._tag === "Right") return;
  prettyFormat(cliResult.left);
  process.exit(1);
}
