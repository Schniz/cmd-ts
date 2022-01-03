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
import { createCircuitBreaker, handleCircuitBreaker } from './circuitbreaker';
import * as Result from './Result';

type ArgTypes = Record<string, ArgParser<any> & Partial<ProvidesHelp>>;
type HandlerFunc<Args extends ArgTypes> = (args: Output<Args>) => any;

type CommandConfig<
  Arguments extends ArgTypes,
  Handler extends HandlerFunc<Arguments>
> = {
  args: Arguments;
  version?: string;
  helpShortIdentifier?: string;
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
  const circuitbreaker = createCircuitBreaker(!!config.version, config.helpShortIdentifier); 

  return {
    name: config.name,
    aliases: config.aliases,
    handler: config.handler,
    description: config.description,
    version: config.version,
    helpTopics() {
      return flatMap(
        Object.values(config.args).concat([circuitbreaker]),
        (x) => x.helpTopics?.() ?? []
      );
    },
    printHelp(context) {
      const lines: string[] = [];
      let name = context.hotPath?.join(' ') ?? '';
      if (!name) {
        name = config.name;
      }

      name = chalk.bold(name);

      if (config.version) {
        name += ' ' + chalk.dim(config.version);
      }

      lines.push(name);

      if (config.description) {
        lines.push(chalk.dim('> ') + config.description);
      }

      const usageBreakdown = groupBy(this.helpTopics(), (x) => x.category);

      for (const [category, helpTopics] of entries(usageBreakdown)) {
        lines.push('');
        lines.push(category.toUpperCase() + ':');
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
          lines.push(line);
        }
      }

      return lines.join('\n');
    },
    register(opts) {
      for (const [, arg] of argEntries) {
        arg.register?.(opts);
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
        if (Result.isErr(result)) {
          errors.push(...result.error.errors);
        } else {
          resultObject[argName] = result.value;
        }
      }

      const unknownArguments: AstNode[] = [];
      for (const node of context.nodes) {
        if (context.visitedNodes.has(node)) {
          continue;
        }

        if (node.type === 'forcePositional') {
          // A `forcePositional` node can't really be visited since it has no meaning
          // other than forcing a positional argument in the parsing phase
          continue;
        } else if (node.type === 'shortOptions') {
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
        return Result.err({
          errors: errors,
          partialValue: resultObject,
        });
      } else {
        return Result.ok(resultObject);
      }
    },
    async run(context) {
      const breaker = await circuitbreaker.parse(context);
      const parsed = await this.parse(context);
      handleCircuitBreaker(context, this, breaker);

      if (Result.isErr(parsed)) {
        return Result.err(parsed.error);
      }

      return Result.ok(await this.handler(parsed.value));
    },
  };
}
