#!/usr/bin/env YARN_SILENT=1 yarn ts-node --

import { either, Either, isRight } from 'fp-ts/lib/Either';
import chalk from 'chalk';
import { array } from 'fp-ts/lib/Array';
import * as t from 'io-ts';
import immer from 'immer';

type Descriptive = {
  description: () => string;
};

type Default<T> = {
  defaultValue(): T;
};

export type Elevated<T extends t.Any> = T &
  Partial<Descriptive & Default<t.TypeOf<T>>>;

type PrintHelp = {
  printHelp(): void;
};

type Named = {
  name: string;
};

/** Elevates a type to clio-ts type */
export function elevate<T extends t.Any>(
  t: T,
  args: Partial<Descriptive & Default<t.TypeOf<T>>>
): Elevated<T> {
  return { ...t, ...args };
}

export type ContextError = { fromIndex: number; toIndex: number; message: string };

export type StringContext = {
  value: string;
  parsed: boolean;
  index: number;
  colorized?: string;
  error?: ContextError;
  hotPath?: boolean;
  parsedBy?: Parser<any>;
};
type ParsingError = t.Errors;

const getArgumentColor = generateColorCycle();

// function parse<P extends Parser<any>>(
//   parser: P,
//   strings: string[]
// ): ReturnType<P['parse']> {
//   return parser.parse(
//     strings.map(
//       (value, index): StringContext => {
//         return {
//           value,
//           index,
//           parsed: false,
//         };
//       }
//     )
//   ) as any;
// }

function run<R extends Runner<any>>(
  runner: R,
  strings: string[]
): ReturnType<R['run']> {
  const context = strings.map(
    (value, index): StringContext => {
      return { value, index, parsed: false };
    }
  );
  return runner.run(context);
}

type HelpTopic = {
  category: string;
  usage: string;
  description: string;
  defaults: string[];
};

type ParsingResult<Into> = {
  value: Either<ParsingError, Into>;
  context: StringContext[];
  standaloneErrorMessages: string[];
  show?: 'help' | 'version';
};

export type Parser<Into> = {
  parse(context: StringContext[]): ParsingResult<Into>;
  helpTopics(): HelpTopic[];
};

function getErrorMessageFor<T extends t.Any>(args: {
  errors: t.Errors;
  decoder: T;
  value: t.TypeOf<T>;
}): string {
  if (!args.value) {
    return 'No value provided';
  }

  const withMessage = args.errors.find(x => x.message);
  return withMessage?.message ?? 'No message provided';
}

function optional<Decoder extends Elevated<t.Any>>(
  decoder: Decoder
): Elevated<t.UnionC<[t.UndefinedC, Decoder]>> {
  const newDecoder = t.union([t.undefined, decoder]);
  const elevated: Elevated<typeof newDecoder> = elevate(newDecoder, {
    defaultValue: () => undefined,
  });
  (elevated as any).name = decoder.name;
  return elevated;
}

function flag<Decoder extends Elevated<t.Any>>(args: {
  decoder: Decoder;
  description?: string;
  long: string;
  env?: string;
}): Parser<t.TypeOf<Decoder>> {
  return {
    helpTopics() {
      let usage = `--${args.long}`;
      // if (args.shorthand) {
      //   usage += `, -${args.shorthand}`;
      // }
      let defaults: string[] = [];
      if (args.env) {
        defaults.push(
          `env: ${args.env}=${chalk.italic(process.env[args.env])}`
        );
      }
      if (args.decoder.defaultValue) {
        defaults.push('optional');
      }
      return [
        {
          category: 'flags',
          defaults,
          usage,
          description:
            args.description ??
            args.decoder.description?.() ??
            args.decoder.name,
        },
      ];
    },
    parse(context) {
      const forcePositionalFlagIndex = context.findIndex(x => x.value === '--');
      let unparsedContext =
        forcePositionalFlagIndex === -1
          ? context
          : context.slice(0, forcePositionalFlagIndex);
      unparsedContext = unparsedContext.filter(x => !x.parsed);

      const numberOfFlags = unparsedContext.filter(
        x => x.value === `--${args.long}`
      );

      if (numberOfFlags.length > 1) {
        return {
          context: context.map(item => {
            if (item.value === `--${args.long}`) {
              return { ...item, colorized: chalk.red(item.value) };
            }
            return item;
          }),
          value: either.throwError([]),
          standaloneErrorMessages: [
            `Too many --${args.long} provided. Expected 1, got: ${numberOfFlags.length}`,
          ],
        };
      }

      if (numberOfFlags.length === 1) {
        const [flagValue] = numberOfFlags;
        const decoded = args.decoder.decode('true');
        const beforeContext = context.slice(0, flagValue.index);
        const afterContext = context.slice(flagValue.index + 1);
        const errorMessages =
          decoded._tag === 'Right'
            ? []
            : [
                getErrorMessageFor({
                  value: 'true',
                  errors: decoded.left,
                  decoder: args.decoder,
                }),
              ];

        return {
          context: [...beforeContext, { ...flagValue }, ...afterContext],
          value: decoded,
          standaloneErrorMessages: errorMessages,
        };
      }

      if (args.env && process.env[args.env] !== undefined) {
        const decoded = args.decoder.decode(process.env[args.env]);
        const errorMessages =
          decoded._tag === 'Right'
            ? []
            : [
                getErrorMessageFor({
                  value: 'true',
                  errors: decoded.left,
                  decoder: args.decoder,
                }),
              ];
        return {
          context,
          value: decoded,
          standaloneErrorMessages: errorMessages,
        };
      }

      if (args.decoder.defaultValue) {
        return {
          context,
          value: either.of(args.decoder.defaultValue()),
          standaloneErrorMessages: [],
        };
      }

      return {
        context,
        value: either.throwError([]),
        standaloneErrorMessages: [`No value provided for --${args.long}`],
      };
    },
  };
}

import { codeFrameColumns } from '@babel/code-frame';

function printAllErrors(context: StringContext[]) {
  let str = '';
  let errors: ContextError[] = [];

  for (const stringContext of context) {
    str += ' ' + stringContext.value;
    str = str.trim();

    if (stringContext.error) {
      const startpoint = str.length + 1 - stringContext.value.length;
      errors.push({
        message: stringContext.error.message,
        fromIndex: startpoint + stringContext.error.fromIndex,
        toIndex: startpoint + stringContext.error.toIndex,
      });
    }
  }

  for (const error of errors) {
    const frame = codeFrameColumns(
      str.slice(0, error.fromIndex - 1) +
        chalk.red.italic(str.slice(error.fromIndex - 1, error.toIndex)) +
        str.slice(error.toIndex),
      {
        start: { line: 1, column: error.fromIndex },
        end: { line: 1, column: error.toIndex },
      },
      {
        message: chalk.red(error.message),
        linesAbove: 0,
        linesBelow: 0,
      }
    );
    console.error(frame);
    console.error();
  }
}

function option<Decoder extends Elevated<t.Any>>(args: {
  decoder: Decoder;
  description?: string;
  shorthand?: string;
  valueDisplayName?: string;
  long: string;
  env?: string;
}): Parser<t.TypeOf<Decoder>> {
  return {
    helpTopics() {
      const valueDisplayName = args.valueDisplayName ?? 'value';
      let usage = `--${args.long} <${valueDisplayName}>`;
      if (args.shorthand) {
        usage += `, -${args.shorthand} <${valueDisplayName}>`;
      }
      let defaults: string[] = [];
      if (args.env) {
        defaults.push(
          `env: ${args.env}=${chalk.italic(process.env[args.env])}`
        );
      }
      if (args.decoder.defaultValue) {
        defaults.push('optional');
      }
      return [
        {
          category: 'options',
          defaults,
          usage,
          description:
            args.description ??
            args.decoder.description?.() ??
            args.decoder.name,
        },
      ];
    },
    parse(context) {
      const forcePositionalFlagIndex = context.findIndex(x => x.value === '--');
      let unparsedContext =
        forcePositionalFlagIndex === -1
          ? context
          : context.slice(0, forcePositionalFlagIndex);
      unparsedContext = unparsedContext.filter(x => !x.parsed);

      const numberOfOptions = unparsedContext.filter(x => {
        return (
          x.value === `--${args.long}` || x.value.startsWith(`--${args.long}=`)
        );
      }).length;

      if (numberOfOptions > 1) {
        return {
          value: either.throwError([]),
          standaloneErrorMessages: [],
          context: immer(context, draft => {
            for (const [index, item] of enumerate(draft)) {
              if (
                item.value.startsWith(`--${args.long}=`) ||
                item.value === `--${args.long}`
              ) {
                item.parsed = true;
                item.colorized = chalk.red(item.value);
                item.error = {
                  message:
                    'Option provided too many times. Expected 1, got: ' +
                    numberOfOptions,
                  fromIndex: 0,
                  toIndex: item.value.length,
                };
              }

              const nextItem = draft[index + 1];
              if (item.value === `--${args.long}`) {
                nextItem.parsed = true;
              }
            }
          }),
        };
      }

      const whitespaceDelimitedArgumentNameIndex = unparsedContext.findIndex(
        x => x.value === `--${args.long}`
      );
      if (whitespaceDelimitedArgumentNameIndex >= 0) {
        const nameValue = unparsedContext[whitespaceDelimitedArgumentNameIndex];
        const valueIndex = whitespaceDelimitedArgumentNameIndex + 1;
        const valueValue = unparsedContext[valueIndex];
        const decoded = args.decoder.decode(valueValue.value);
        const error: ContextError | undefined =
          decoded._tag === 'Right'
            ? undefined
            : {
                fromIndex: 0,
                toIndex: valueValue.value.length,
                message: getErrorMessageFor({
                  errors: decoded.left,
                  decoder: args.decoder,
                  value: valueValue.value,
                }),
              };
        const color = error ? chalk.red : getArgumentColor();
        const newContext = immer(context, draft => {
          draft[nameValue.index] = {
            ...nameValue,
            parsed: true,
            colorized: color(nameValue.value),
            hotPath: false,
          };
          draft[valueValue.index] = {
            ...valueValue,
            parsed: true,
            error: error,
            colorized: color.italic(valueValue.value),
            hotPath: false,
          };
        });
        return {
          value: decoded,
          context: newContext,
          standaloneErrorMessages: [],
        };
      }

      const equalsDelimitedArgumentName = unparsedContext.find(x =>
        x.value.startsWith(`--${args.long}=`)
      );
      if (equalsDelimitedArgumentName) {
        const [key, ...values] = equalsDelimitedArgumentName.value.split('=');
        const value = values.join('=');
        const decoded = args.decoder.decode(value);
        const error: ContextError | undefined =
          decoded._tag === 'Right'
            ? undefined
            : {
                fromIndex: key.length + 1,
                toIndex: key.length + 1 + value.length,
                message: getErrorMessageFor({
                  value,
                  errors: decoded.left,
                  decoder: args.decoder,
                }),
              };
        const color = error ? chalk.red : getArgumentColor();

        const newContext = immer(context, draft => {
          draft[equalsDelimitedArgumentName.index] = {
            ...equalsDelimitedArgumentName,
            parsed: true,
            colorized: color(`${key}${chalk.dim('=')}${chalk.italic(value)}`),
            error,
          };
        });
        return {
          value: decoded,
          context: newContext,
          standaloneErrorMessages: [],
        };
      }

      if (args.env && process.env[args.env] !== undefined) {
        const value = process.env[args.env];
        const decoded = args.decoder.decode(value);
        const errorMessages =
          decoded._tag === 'Right'
            ? []
            : [
                getErrorMessageFor({
                  value,
                  errors: decoded.left,
                  decoder: args.decoder,
                }),
              ];
        return {
          value: decoded,
          context,
          standaloneErrorMessages: errorMessages,
        };
      }

      if (args.decoder.defaultValue) {
        const value = args.decoder.defaultValue();
        return {
          value: either.of(value),
          context,
          standaloneErrorMessages: [],
        };
      }

      return {
        value: either.throwError([]),
        context,
        standaloneErrorMessages: [`No value provided for --${args.long}`],
      };
    },
  };
}

type Into<P extends Parser<any>> = P extends Parser<infer R> ? R : never;

// function both<P1 extends Parser<any>, P2 extends Parser<any>>(
//   p1: P1,
//   p2: P2
// ): Parser<[Into<P1>, Into<P2>]> {
//   return {
//     parse(context) {
//       const p1Value = p1.parse(context);
//       const p2Value = p2.parse(p1Value.context);
//       return {
//         context: p2Value.context,
//         value: either.chain(p1Value.value, p1Inner => {
//           return either.map(p2Value.value, p2Inner => [p1Inner, p2Inner]);
//         }),
//       };
//     },
//   };
// }

function entries<Obj extends Record<string, any>>(
  obj: Obj
): { [key in keyof Obj]: [key, Obj[key]] }[keyof Obj][] {
  return Object.entries(obj);
}

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

type Runner<Output> = {
  run(strings: StringContext[]): Output;
};

function* enumerate<T>(arr: T[]): Generator<[number, T]> {
  for (let i = 0; i < arr.length; i++) {
    yield [i, arr[i]];
  }
}

const bool = elevate(BooleanFromString, {
  defaultValue: () => false,
  description: () => 'boolean',
});

const helpFlag = flag({
  decoder: bool,
  description: 'show help',
  long: 'help',
});

const versionFlag = flag({
  decoder: bool,
  description: 'show current version',
  long: 'version',
});

function command<
  ParsersRecord extends Record<string, Parser<any>>,
  Handler extends (
    parsed: { [key in keyof ParsersRecord]: Into<ParsersRecord[key]> }
  ) => any
>(config: {
  name: string;
  description?: string;
  version?: string;
  args: ParsersRecord;
  handler: Handler;
  allowUnparsedItems?: boolean;
}): Parser<{ [key in keyof ParsersRecord]: Into<ParsersRecord[key]> }> &
  Partial<Descriptive> &
  Runner<ReturnType<Handler>> &
  Named &
  PrintHelp {
  type Result = { [key in keyof ParsersRecord]: Into<ParsersRecord[key]> };
  const parserEntries = entries(config.args);
  const commandDescription = config.description;

  return {
    name: config.name,
    description: !commandDescription ? undefined : () => commandDescription,
    helpTopics() {
      const subentries = parserEntries.flatMap(([, parser]) =>
        parser.helpTopics()
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
      console.log();

      if (commandDescription) {
        console.log('  ' + commandDescription);
        console.log();
      }

      const usageBreakdown = groupBy(this.helpTopics(), x => x.category);

      for (const [category, helpTopics] of entries(usageBreakdown)) {
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
    parse(context) {
      const parsedHelp = helpFlag.parse(context);
      const parsedVersion = config.version
        ? versionFlag.parse(context)
        : undefined;
      const shouldShowHelp =
        isRight(parsedHelp.value) && parsedHelp.value.right;
      const shouldShowVersion =
        parsedVersion?.value._tag === 'Right' && parsedVersion.value.right;
      let newContext = context;
      const errorMessages: string[] = [];
      const eitherEntries = array.traverse(either)(
        parserEntries,
        ([name, parser]) => {
          const parsed = parser.parse(newContext);
          newContext = parsed.context;
          errorMessages.push(...parsed.standaloneErrorMessages);
          return either.map(parsed.value, (decoded): [keyof Result, any] => [
            name,
            decoded,
          ]);
        }
      );

      const show: ParsingResult<any>['show'] = shouldShowHelp
        ? 'help'
        : shouldShowVersion
        ? 'version'
        : undefined;

      const valueFromPairs = either.map(eitherEntries, decodedPairs => {
        const result = {} as Result;
        for (const [key, value] of decodedPairs) {
          result[key] = value;
        }
        return result;
      });

      if (!config.allowUnparsedItems) {
        let failed = false;
        newContext = newContext.map(item => {
          if (item.parsed) {
            return item;
          }

          failed = true;

          return {
            ...item,
            error: {
              message: 'Unused element',
              fromIndex: 0,
              toIndex: item.value.length,
            },
          };
        });

        return {
          context: newContext,
          standaloneErrorMessages: errorMessages,
          value: failed ? either.throwError([]) : valueFromPairs,
        };
      }

      return {
        context: newContext,
        value: valueFromPairs,
        standaloneErrorMessages: errorMessages,
        show,
      };
    },
    run(context) {
      const result = this.parse(context);

      if (result.show === 'help') {
        this.printHelp();
        process.exit(1);
      }

      if (result.show === 'version') {
        console.log(config.version);
        process.exit(1);
      }

      if (result.value._tag === 'Left') {
        const numberOfErrors =
          result.context.filter(x => x.error).length +
          result.standaloneErrorMessages.length;
        console.error(
          chalk.red.bold('error:') +
            ` found ${chalk.yellow(numberOfErrors)} error${
              numberOfErrors > 1 ? 's' : ''
            }:`
        );
        console.error();

        printAllErrors(result.context);

        if (result.standaloneErrorMessages.length === 1) {
          console.error('Along the following error:');
        } else if (result.standaloneErrorMessages.length > 1) {
          console.error('Along the following errors:');
        }

        const maxWidthForNumber = String(result.standaloneErrorMessages.length)
          .length;
        for (const [index, errorMessage] of enumerate(
          result.standaloneErrorMessages
        )) {
          const number = padNoAnsi(`${index + 1}`, maxWidthForNumber, 'start');
          console.error(chalk.red(`  ${number}. ${errorMessage}`));
        }

        const helpCmdBase = getColorizedInput(
          result.context.filter(x => x.hotPath)
        );
        const helpCmd = stripAnsi(helpCmdBase) + ' --help';
        console.error();
        console.error(
          chalk.red.bold('hint:') +
            ` For more information try '${chalk.yellow(helpCmd)}'`
        );

        return;
      }

      return config.handler(result.value.right);
    },
  };
}

function getColorizedInput(strings: StringContext[]): string {
  const results = [] as string[];

  for (const stringContext of strings) {
    const printable = stringContext.colorized ?? stringContext.value;
    if (!stringContext.parsed) {
      results.push(chalk.dim(printable));
    } else {
      results.push(printable);
    }
  }

  return results.join(' ');
}

function binaryParser<R extends Runner<any> & Partial<Named>>(cmd: R): R {
  return {
    ...cmd,
    run(strings) {
      const [, binary, ...rest] = strings;
      const context = [
        {
          ...binary,
          value: cmd.name ?? binary.value,
          parsed: true,
          hotPath: true,
        },
        ...rest,
      ].map((x, index) => ({ ...x, index }));
      return cmd.run(context);
    },
  };
}

import { generateColorCycle, padNoAnsi } from './utils';
import stripAnsi from 'strip-ansi';
import { Integer } from './example/test-types';
import { BooleanFromString } from './BooleanFromString';

const greeting = elevate(t.string, { defaultValue: () => 'Hello' });

const myParser = command({
  name: 'my-parser',
  version: '0.1.0',
  args: {
    someGreeting: option({ decoder: greeting, long: 'greeting' }),
    greetee: option({
      decoder: t.string,
      long: 'name',
      description: 'Someone to greet',
      env: 'TEST_NAME',
    }),
    times: option({
      decoder: optional(Integer),
      long: 'times',
    }),
  },
  handler: args => {
    console.log(`${args.someGreeting}, ${args.greetee}!`);
  },
});

const cli = binaryParser(myParser);

run(cli, process.argv);
