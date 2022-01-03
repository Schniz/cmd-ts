// import { Runner, Into } from './runner';
import {
  ArgParser,
  ParsingInto,
  ParsingResult,
  ParseContext,
} from './argparser';
import { positional } from './positional';
import { From } from './from';
import { Runner } from './runner';
import { Aliased, Named, Descriptive, Versioned } from './helpdoc';
import chalk from 'chalk';
import { createCircuitBreaker, handleCircuitBreaker } from './circuitbreaker';
import * as Result from './Result';
import didYouMean from 'didyoumean';

type Output<
  Commands extends Record<string, ArgParser<any> & Runner<any, any>>
> = {
  [key in keyof Commands]: { command: key; args: ParsingInto<Commands[key]> };
}[keyof Commands];

type RunnerOutput<
  Commands extends Record<string, Runner<any, any> & ArgParser<any>>
> = {
  [key in keyof Commands]: {
    command: key;
    value: Commands[key] extends Runner<any, infer X> ? X : never;
  };
}[keyof Commands];

/**
 * Combine multiple `command`s into one
 */
export function subcommands<
  Commands extends Record<
    string,
    ArgParser<any> & Runner<any, any> & Partial<Descriptive & Aliased>
  >
>(config: {
  name: string;
  version?: string;
  helpShortIdentifier?: string;
  cmds: Commands;
  description?: string;
}): ArgParser<Output<Commands>> &
  Named &
  Partial<Descriptive & Versioned> &
  Runner<Output<Commands>, RunnerOutput<Commands>> {
  const circuitbreaker = createCircuitBreaker(!!config.version, config.helpShortIdentifier);
  const type: From<string, keyof Commands> = {
    async from(str) {
      const commands = Object.entries(config.cmds)
        .map(([name, cmd]) => {
          return {
            cmdName: name as keyof Commands,
            names: [name, ...(cmd.aliases ?? [])],
          };
        });
      const cmd = commands
        .find(x => x.names.includes(str));
      if (cmd) {
        return cmd.cmdName;
      }
      let errorMessage = `Not a valid subcommand name`;

      const closeOptions = didYouMean(str, flatMap(commands, x => x.names));
      if (closeOptions) {
        const option = Array.isArray(closeOptions) ? closeOptions[0] : closeOptions;
        errorMessage += `\nDid you mean ${chalk.italic(option)}?`;
      }

      throw new Error(errorMessage);
    },
  };

  const subcommand = positional({
    displayName: 'subcommand',
    description: 'one of ' + Object.keys(config.cmds).join(', '),
    type,
  });

  return {
    version: config.version,
    description: config.description,
    name: config.name,
    handler: value => {
      const cmd = config.cmds[value.command];
      return cmd.handler(value.args);
    },
    register(opts) {
      for (const cmd of Object.values(config.cmds)) {
        cmd.register(opts);
      }
      circuitbreaker.register(opts);
    },
    printHelp(context) {
      const lines: string[] = [];
      const argsSoFar = context.hotPath?.join(' ') ?? 'cli';

      lines.push(chalk.bold(argsSoFar + chalk.italic(' <subcommand>')));

      if (config.description) {
        lines.push(chalk.dim('> ') + config.description);
      }

      lines.push('');
      lines.push(`where ${chalk.italic('<subcommand>')} can be one of:`);
      lines.push('');

      for (const key of Object.keys(config.cmds)) {
        const cmd = config.cmds[key];
        let description = cmd.description ?? '';
        description = description && ' - ' + description + ' ';
        if (cmd.aliases?.length) {
          const aliasTxt = cmd.aliases.length === 1 ? 'alias' : 'aliases';
          const aliases = cmd.aliases.join(', ');
          description += chalk.dim(`[${aliasTxt}: ${aliases}]`);
        }
        const row = chalk.dim('- ') + key + description;
        lines.push(row.trim());
      }

      const helpCommand = chalk.yellow(`${argsSoFar} <subcommand> --help`);

      lines.push('');
      lines.push(chalk.dim(`For more help, try running \`${helpCommand}\``));
      return lines.join('\n');
    },
    async parse(
      context: ParseContext
    ): Promise<ParsingResult<Output<Commands>>> {
      if (context.hotPath?.length === 0) {
        context.hotPath.push(config.name);
      }
      const parsed = await subcommand.parse(context);

      if (Result.isErr(parsed)) {
        return Result.err({
          errors: parsed.error.errors,
          partialValue: {},
        });
      }

      context.hotPath?.push(parsed.value as string);

      const cmd = config.cmds[parsed.value];
      const parsedCommand = await cmd.parse(context);
      if (Result.isErr(parsedCommand)) {
        return Result.err({
          errors: parsedCommand.error.errors,
          partialValue: {
            command: parsed.value,
            args: parsedCommand.error.partialValue,
          },
        });
      }
      return Result.ok({
        args: parsedCommand.value,
        command: parsed.value,
      });
    },
    async run(context): Promise<ParsingResult<RunnerOutput<Commands>>> {
      if (context.hotPath?.length === 0) {
        context.hotPath.push(config.name);
      }

      const parsedSubcommand = await subcommand.parse(context);

      if (Result.isErr(parsedSubcommand)) {
        const breaker = await circuitbreaker.parse(context);
        handleCircuitBreaker(context, this, breaker);

        return Result.err({ ...parsedSubcommand.error, partialValue: {} });
      }

      context.hotPath?.push(parsedSubcommand.value as string);

      const cmd = config.cmds[parsedSubcommand.value];
      const commandRun = await cmd.run(context);

      if (Result.isOk(commandRun)) {
        return Result.ok({
          command: parsedSubcommand.value,
          value: commandRun.value,
        });
      }

      return Result.err({
        ...commandRun.error,
        partialValue: {
          command: parsedSubcommand.value,
          value: commandRun.error.partialValue,
        },
      });
    },
  };
}

function flatMap<T, R>(array: T[], f: (t: T) => R[]): R[] {
  const rs: R[] = [];
  for (const item of array) {
    rs.push(...f(item));
  }
  return rs;
}
