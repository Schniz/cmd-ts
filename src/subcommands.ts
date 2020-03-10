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
import { Aliased, Named, Descriptive } from './helpdoc';
import chalk from 'chalk';
import { circuitbreaker } from './circuitbreaker';

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
  cmds: Commands;
  description?: string;
}): ArgParser<Output<Commands>> &
  Named &
  Partial<Descriptive> &
  Runner<Output<Commands>, RunnerOutput<Commands>> {
  const type: From<string, keyof Commands> = {
    async from(str) {
      const cmd = Object.entries(config.cmds)
        .map(([name, cmd]) => {
          return {
            cmdName: name as keyof Commands,
            names: [name, ...(cmd.aliases ?? [])],
          };
        })
        .find(x => x.names.includes(str));
      if (cmd) {
        return { result: 'ok', value: cmd.cmdName };
      }
      return { result: 'error', message: 'Not a valid subcommand name' };
    },
  };

  const subcommand = positional({
    displayName: 'subcommand',
    description: 'one of ' + Object.keys(config.cmds).join(', '),
    type,
  });

  return {
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
      const argsSoFar = context.hotPath?.join(' ') ?? 'cli';

      console.log(chalk.bold(argsSoFar + chalk.italic(' <subcommand>')));

      if (config.description) {
        console.log(chalk.dim('> ') + config.description);
      }

      console.log();
      console.log(`where ${chalk.italic('<subcommand>')} can be one of:`);
      console.log();

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
        console.log(row.trim());
      }

      const helpCommand = chalk.yellow(`${argsSoFar} <subcommand> --help`);

      console.log();
      console.log(chalk.dim(`For more help, try running \`${helpCommand}\``));

      process.exit(1);
    },
    async parse(
      context: ParseContext
    ): Promise<ParsingResult<Output<Commands>>> {
      const parsed = await subcommand.parse(context);

      if (parsed.outcome === 'failure') {
        return {
          ...parsed,
          partialValue: {},
        };
      }

      context.hotPath?.push(parsed.value as string);

      const cmd = config.cmds[parsed.value];
      const parsedCommand = await cmd.parse(context);
      if (parsedCommand.outcome === 'failure') {
        return {
          outcome: 'failure',
          errors: parsedCommand.errors,
          partialValue: {
            command: parsed.value as any,
            args: { ...parsedCommand.partialValue } as any,
          },
        };
      }
      return {
        outcome: 'success',
        value: { args: parsedCommand.value, command: parsed.value },
      };
    },
    async run(context): Promise<ParsingResult<RunnerOutput<Commands>>> {
      const parsedSubcommand = await subcommand.parse(context);

      if (parsedSubcommand.outcome === 'failure') {
        const breaker = await circuitbreaker.parse(context);
        if (breaker.outcome === 'success') {
          if (breaker.value === 'help') {
            this.printHelp(context);
            process.exit(1);
          }

          if (breaker.value === 'version') {
            console.log(this.version || '0.0.0');
            process.exit(0);
          }
        }

        return { ...parsedSubcommand, partialValue: {} };
      }

      context.hotPath?.push(parsedSubcommand.value as string);

      const cmd = config.cmds[parsedSubcommand.value];
      const commandRun = await cmd.run(context);

      if (commandRun.outcome === 'success') {
        return {
          outcome: 'success',
          value: { command: parsedSubcommand.value, value: commandRun.value },
        };
      }

      return {
        ...commandRun,
        partialValue: {
          command: parsedSubcommand.value,
          value: commandRun.partialValue,
        },
      };
    },
  };
}
