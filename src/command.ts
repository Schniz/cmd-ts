import chalk from 'chalk';
import {
  ParsingInto,
  ArgParser,
  ParsingError,
  ParsingResult,
  ParseContext,
} from './argparser';
import { AstNode } from './newparser/parser';
import {
  PrintHelp,
  ProvidesHelp,
  Versioned,
  Named,
  Descriptive,
  Aliased,
} from './helpdoc';
import { padNoAnsi, entries, groupBy, flatMap } from './utils';
import { Runner } from './runner';
import { circuitbreaker } from './circuitbreaker';

type ArgTypes = Record<string, ArgParser<any> & Partial<ProvidesHelp>>;
type HandlerFunc<Args extends ArgTypes> = (args: Output<Args>) => any;

type CommandConfig<
  Arguments extends ArgTypes,
  Handler extends HandlerFunc<Arguments>
> = {
  args: Arguments;
  version?: string;
  name: string;
  description?: string;
  handler: Handler;
  aliases?: string[];
};

type Output<Args extends ArgTypes> = {
  [key in keyof Args]: ParsingInto<Args[key]>;
};

/**
 * A command line utility.
 *
 * A combination of multiple flags, options and arguments
 * with a common name and a handler that expects them as input.
 */
export function command<
  Arguments extends ArgTypes,
  Handler extends HandlerFunc<Arguments>
>(
  config: CommandConfig<Arguments, Handler>
): ArgParser<Output<Arguments>> &
  PrintHelp &
  ProvidesHelp &
  Named &
  Runner<Output<Arguments>, ReturnType<Handler>> &
  Partial<Versioned & Descriptive & Aliased> {
  const argEntries = entries(config.args);

  return {
    name: config.name,
    aliases: config.aliases,
    handler: config.handler,
    description: config.description,
    version: config.version,
    helpTopics() {
      return flatMap(
        Object.values(config.args).concat([circuitbreaker]),
        x => x.helpTopics?.() ?? []
      );
    },
    printHelp(context) {
      let name = context.hotPath?.join(' ') ?? '';
      if (!name) {
        name = config.name;
      }

      name = chalk.bold(name);

      if (config.version) {
        name += ' ' + chalk.dim(config.version);
      }

      console.log(name);

      if (config.description) {
        console.log(chalk.dim('> ') + config.description);
      }

      const usageBreakdown = groupBy(this.helpTopics(), x => x.category);

      for (const [category, helpTopics] of entries(usageBreakdown)) {
        console.log();
        console.log(category.toUpperCase() + ':');
        const widestUsage = helpTopics.reduce((len, curr) => {
          return Math.max(len, curr.usage.length);
        }, 0);
        for (const helpTopic of helpTopics) {
          let line = '';
          line += '  ' + padNoAnsi(helpTopic.usage, widestUsage, 'end');
          line += ' - ';
          line += helpTopic.description;
          for (const defaultValue of helpTopic.defaults) {
            line += chalk.dim(` [${defaultValue}]`);
          }
          console.log(line);
        }
      }
    },
    register(opts) {
      for (const [, arg] of argEntries) {
        arg.register(opts);
      }
    },
    async parse(
      context: ParseContext
    ): Promise<ParsingResult<Output<Arguments>>> {
      if (context.hotPath?.length === 0) {
        context.hotPath.push(config.name);
      }

      const resultObject = {} as Output<Arguments>;
      const errors: ParsingError[] = [];

      for (const [argName, arg] of argEntries) {
        const result = await arg.parse(context);
        if (result.outcome === 'failure') {
          errors.push(...result.errors);
        } else {
          resultObject[argName] = result.value;
        }
      }

      const unknownArguments: AstNode[] = [];
      for (const node of context.nodes) {
        if (context.visitedNodes.has(node)) {
          continue;
        }

        if (node.type === 'shortOptions') {
          for (const option of node.options) {
            if (context.visitedNodes.has(option)) {
              continue;
            }
            unknownArguments.push(option);
          }
        } else {
          unknownArguments.push(node);
        }
      }

      if (unknownArguments.length > 0) {
        errors.push({
          message: 'Unknown arguments',
          nodes: unknownArguments,
        });
      }

      if (errors.length > 0) {
        return {
          outcome: 'failure',
          errors: errors,
          partialValue: resultObject,
        };
      } else {
        return {
          outcome: 'success',
          value: resultObject,
        };
      }
    },
    async run(context) {
      const parsed = await this.parse(context);

      const breaker = await circuitbreaker.parse(context);
      const shouldShowHelp =
        breaker.outcome === 'success' && breaker.value === 'help';
      const shouldShowVersion =
        breaker.outcome === 'success' && breaker.value === 'version';

      if (shouldShowHelp) {
        this.printHelp(context);
        process.exit(1);
      } else if (shouldShowVersion) {
        console.log(config.version || '0.0.0');
        process.exit(0);
      }

      if (parsed.outcome === 'failure') {
        return {
          outcome: 'failure',
          errors: parsed.errors,
          partialValue: { ...parsed.partialValue },
        };
      }

      return { outcome: 'success', value: this.handler(parsed.value) };
    },
  };
}
