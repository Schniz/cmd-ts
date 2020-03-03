import chalk from 'chalk';
import {
  ParsingInto,
  ArgParser,
  ParsingError,
  ParsingResult,
} from './argparser';
import { AstNode } from '../newparser/parser';
import { PrintHelp, ProvidesHelp, Versioned } from './helpdoc';
import { padNoAnsi } from '../utils';
import { flag } from './flag';
import { identity } from './from';
import { Runner } from './runner';

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
  failOnUnknownArguments: boolean;
  handler: Handler;
};

type Output<Args extends ArgTypes> = {
  [key in keyof Args]: ParsingInto<Args[key]>;
};

function groupBy<A, B extends string>(
  objs: A[],
  f: (a: A) => B
): Record<B, A[]> {
  const result = {} as Record<B, A[]>;
  for (const obj of objs) {
    const key = f(obj);
    result[key] = result[key] ?? [];
    result[key].push(obj);
  }
  return result;
}

const helpFlag = flag({
  long: 'help',
  short: 'h',
  decoder: identity<boolean>(),
  description: 'show help',
});

const versionFlag = flag({
  long: 'version',
  short: 'v',
  decoder: identity<boolean>(),
  description: 'print the version',
});

export function command<
  Arguments extends ArgTypes,
  Handler extends HandlerFunc<Arguments>
>(
  config: CommandConfig<Arguments, Handler>
): ArgParser<Output<Arguments>> &
  PrintHelp &
  ProvidesHelp &
  Runner<Output<Arguments>> &
  Partial<Versioned> {
  const argEntries = entries(config.args);

  return {
    version: config.version,
    helpTopics() {
      const subentries = argEntries.flatMap(
        ([, parser]) => parser.helpTopics?.() ?? []
      );
      const withHelpFlag = [...subentries, ...helpFlag.helpTopics()];

      if (!config.version) {
        return withHelpFlag;
      } else {
        return [...withHelpFlag, ...versionFlag.helpTopics()];
      }
    },
    printHelp() {
      let name = config.name;
      if (config.version) {
        name += ' ' + config.version;
      }

      console.log(name);

      if (config.description) {
        console.log();
        console.log('  ' + config.description);
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
          line += padNoAnsi(helpTopic.usage, widestUsage + 2, 'start');
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
    parse(context): ParsingResult<Output<Arguments>> {
      const resultObject = {} as Output<Arguments>;
      const errors: ParsingError[] = [];

      for (const [argName, arg] of argEntries) {
        const result = arg.parse(context);
        if (result.outcome === 'failure') {
          errors.push(...result.errors);
        } else {
          resultObject[argName] = result.value;
        }
      }

      if (config.failOnUnknownArguments) {
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
      }

      if (errors.length > 0) {
        return {
          outcome: 'failure',
          errors: errors,
        };
      } else {
        return {
          outcome: 'success',
          value: resultObject,
        };
      }
    },
    run(context) {
      const help = helpFlag.parse(context);
      const version = versionFlag.parse(context);

      if (help.outcome === 'success' && help.value) {
        return { type: 'circuitbreaker', value: 'help' };
      } else if (version.outcome === 'success' && version.value) {
        return { type: 'circuitbreaker', value: 'version' };
      } else {
        return { type: 'parsing', value: this.parse(context) };
      }
    },
  };
}

function entries<Obj extends Record<string, any>>(
  obj: Obj
): { [key in keyof Obj]: [key, Obj[key]] }[keyof Obj][] {
  return Object.entries(obj);
}
