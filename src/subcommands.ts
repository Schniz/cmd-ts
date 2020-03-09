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
  const decoder: From<string, keyof Commands> = {
    from(str) {
      if (config.cmds[str]) {
        return { result: 'ok', value: str };
      }
      return { result: 'error', message: 'Not a valid subcommand name' };
    },
  };
  const subcommand = positional({
    displayName: 'subcommand',
    description: 'one of ' + Object.keys(config.cmds).join(', '),
    decoder,
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
      const description = '';
      const argsSoFar = context.hotPath?.join(' ') ?? 'cli';

      console.log(argsSoFar + chalk.italic(' <subcommand>'));
      console.log();

      if (description) {
        console.log(description);
        console.log();
      }

      console.log(`${chalk.italic('<subcommand>')} can be one of:`);
      console.log();

      for (const key of Object.keys(config.cmds)) {
        let description = config.cmds[key].description ?? '';
        description = description && ' - ' + description;
        console.log(chalk.dim('- ') + key + description);
      }

      const helpCommand = chalk.yellow(`${argsSoFar} <subcommand> --help`);

      console.log();
      console.log(chalk.dim(`For more help, try running \`${helpCommand}\``));

      process.exit(1);
    },
    parse(context: ParseContext): ParsingResult<Output<Commands>> {
      const parsed = subcommand.parse(context);

      if (parsed.outcome === 'failure') {
        return {
          ...parsed,
          partialValue: {},
        };
      }

      context.hotPath?.push(parsed.value as string);

      const cmd = config.cmds[parsed.value];
      const parsedCommand = cmd.parse(context);
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
    run(context): ParsingResult<RunnerOutput<Commands>> {
      const parsedSubcommand = subcommand.parse(context);

      if (parsedSubcommand.outcome === 'failure') {
        const breaker = circuitbreaker.parse(context);
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
      const commandRun = cmd.run(context);

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
