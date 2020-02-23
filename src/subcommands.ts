import { fromStr } from './fromStr';
import { either, Either } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { ParseError, Parser, Into } from './Parser';
import { TypeRecord } from './composedType';
import { ParseItem } from './argparse';
import stripAnsi from 'strip-ansi';
import { withMessage } from 'io-ts-types/lib/withMessage';
import chalk from 'chalk';
import { contextToString } from './utils';

type SubcommandConfig = Parser<any> | SubcommandConfigMap<any>;

type SubcommandConfigMap<T> = {
  cmd: Parser<T>;
  description?: string;
  aliases?: string[];
};

type SubcommandConfigCmd<T extends SubcommandConfig> = T extends Parser<infer R>
  ? Parser<R>
  : T extends SubcommandConfigMap<infer R>
  ? Parser<R>
  : never;

type SubcommandResult<Config extends Record<string, SubcommandConfig>> = {
  [key in keyof Config]: {
    command: key;
    args: Into<SubcommandConfigCmd<Config[key]>>;
  };
} extends infer X
  ? X[keyof X]
  : never;

function isSubcommandMap(x: SubcommandConfig): x is SubcommandConfigMap<any> {
  return (x as any).cmd;
}

function expandSubcommandConfig<X extends Record<string, SubcommandConfig>>(
  config: X
): { [key in keyof X]: SubcommandConfigMap<any> } {
  const newConfig = {} as { [key in keyof X]: SubcommandConfigMap<any> };
  for (const [configName, configValue] of Object.entries(config)) {
    newConfig[configName as keyof X] = isSubcommandMap(configValue)
      ? configValue
      : { cmd: configValue, description: configValue.description };
  }
  return newConfig;
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
export function subcommands<Config extends Record<string, SubcommandConfig>>(
  config: Config,
  description?: string
): Parser<SubcommandResult<Config>> {
  const expandedConfig = expandSubcommandConfig(config);
  const cmdNames = Object.keys(config);
  const literals = cmdNames.map(x =>
    literalWithAliases(x, expandedConfig[x].aliases ?? [])
  );
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
      let description = expandedConfig[key].description ?? '';
      description = description && ' - ' + description;
      console.log(chalk.dim('- ') + key + description);
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
      return either.map(
        expandedConfig[cmdName].cmd.parse(args, newContext),
        result => {
          return { command: cmdName, args: result } as SubcommandResult<Config>;
        }
      );
    });
  }

  return { parse };
}

function literalWithAliases<L extends string>(
  literal: L,
  aliases: string[]
): t.Type<L, string> {
  const options = [literal, ...aliases];
  return fromStr((obj, ctx) => {
    if (options.includes(obj)) {
      return t.success(literal);
    }
    return t.failure(obj, ctx, 'expected one of ' + options);
  });
}
