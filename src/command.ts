import { tupleWithOneElement } from './tupleWithOneElement';
import { Either, either } from 'fp-ts/lib/Either';
import chalk from 'chalk';
import { contextToString } from './utils';
import * as t from 'io-ts';
import {
  argparse,
  ArgParserResult,
  ArgParserNamedArguments,
  ParseItem,
} from './argparse';
import kebabCase from 'lodash.kebabcase';
import {
  composedType,
  ComposedType,
  TypeRecord,
  TROutput,
} from './composedType';
import { Parser, ParseError } from './Parser';
import { BooleanFromString } from './BooleanFromString';

/**
 * A boolean argument, parses a string into a boolean:
 *
 * * `'true'` => true
 * * `'false'` => false
 * * otherwise => fails
 */
export const bool = BooleanFromString;

/**
 * An optional argument type.
 *
 * @param decoder an `io-ts` decoder to make undefinedable.
 * @example
 *  ```ts
 *  const optionalString = optional(t.string);
 *  ```
 */
export function optional<T extends t.Any>(decoder: T) {
  return t.union([t.undefined, decoder]);
}

/**
 * A named argument (`--long {value}` for the long names or `-s {value}` as short)
 */
export type NamedArgument = {
  kind: 'named';
  /**
   * An `io-ts` decoder to be used for parsing the values.
   *
   * By default, the type expected to be able to parse from a list of strings,
   * so users will be able to write command line applications with multiple
   * named arguments with the same name: `--value=hello --value=world`.
   *
   * To allow only one value, use the [[single]] combinator that turns a decoder from string
   * to a decoder of a list of strings.
   */
  type: t.Type<any, string[]>;
  /**
   * A short (one-letter) name to be used. For instance, providing `s` would result in
   * allowing the user to pass `-s value`
   */
  short?: string;
  /**
   * A long name to be used. For instance, providing `long-name` would result in
   * allowing the user to pass `--long-name value`
   */
  long?: string;
  /**
   * A display name for the value, when showing help. For instance, when providing "hello",
   * it would result as `--long-name <hello>`
   */
  argumentName?: string;
  /**
   * An environment variable name to take as default, if given
   */
  env?: string;
  /**
   * A description to be provided when showing help
   */
  description?: string;
  /**
   * A default value, when no value is given
   */
  defaultValue?: string;
};

/**
 * A boolean argument (`--long` for long booleans, `-s` for short booleans)
 */
export type BooleanArgument = {
  kind: 'boolean';
  /**
   * An `io-ts` decoder to be used for parsing the values.
   *
   * By default, the type expected to be able to parse from a list of strings,
   * so users will be able to write command line applications with multiple
   * named arguments with the same name: `--value=hello --value=world`.
   *
   * To allow only one value, use the [[single]] combinator that turns a decoder from string
   * to a decoder of a list of strings.
   */
  type: t.Type<any, string[]>;
  /**
   * A short (one-letter) name to be used. For instance, providing `s` would result in
   * allowing the user to pass `-s`
   */
  short?: string;
  /**
   * A long name to be used. For instance, providing `long-name` would result in
   * allowing the user to pass `--long-name`
   */
  long?: string;
  /**
   * A description to be provided when showing help
   */
  description?: string;
  /**
   * A default value, when missing
   */
  defaultValue?: boolean;
};

/**
 * A positional argument
 */
export type PositionalArgument = {
  kind: 'positional';
  /**
   * A type to parse from the string
   */
  type: t.Type<any, string>;
  /**
   * A display name for the argument. If missing, inferred from the given type
   */
  displayName?: string;
  /**
   * A description to be provided when showing help
   */
  description?: string;
};

/**
 * An argument configuration
 */
export type Argument = PositionalArgument | NamedArgument | BooleanArgument;

/**
 * A command configurations. An object where the keys are the results of a successful parse
 * and the values are a parsable [[Argument]]
 */
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

function argparseArguments<Config extends CommandConfig>(
  config: Config
): ArgParserNamedArguments {
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

/**
 * Creates a command line argument parser
 *
 * @param args the command arguments: an object where the keys are the names in your code
 * and the values are an [[Argument]]
 * @example
 * ```ts
 * const cmd = command({
 *   positional: { kind: 'positional', type: t.string },
 *   named: { kind: 'named', long: 'username', type: single(t.string), env: 'MY_APP_USER' },
 *   someBoolean: { kind: 'boolean', long: 'authenticate', short: 'a', type: bool }
 * });
 *
 * const { positional, named, someBoolean } = parse(cmd, process.argv.slice(2));
 * ```
 * @returns [[Parser]] which parses into an object where its keys are the same
 * as the keys provided into the `args` argument, and the values are the result of the types for each key.
 */
export function command<Config extends CommandConfig>(
  args: Config,
  description?: string
): Parser<TROutput<{ [key in keyof Config]: Config[key]['type'] }>> {
  const types = getTypes(args);
  const type = composedType(types);
  const argparseOptions = argparseArguments(args);
  const defaultValues: Record<string, string[]> = {};

  for (const [argName, argValue] of Object.entries(args)) {
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
        } else {
          defaultValues[argName] = [];
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

    if (Object.keys(args).length > 0) {
      console.log('Use the following arguments:');
      console.log();
    }

    for (const [argName, argValue] of Object.entries(args)) {
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

  type CommandOutput<TR extends TypeRecord> = TROutput<TR> & { _: string[] };

  function decodeArgParse<TR extends TypeRecord>(
    argParseResult: ArgParserResult,
    namedArgDecoder: ComposedType<TR>
  ): Either<ParseError<TR>, CommandOutput<TR>> {
    const result = either.map(namedArgDecoder(argParseResult.named), named => ({
      ...named,
      _: argParseResult.positional,
    }));
    return either.mapLeft(result, errors => {
      return { parsed: argParseResult, errors, commandConfig: args };
    });
  }

  function parse(
    argv: string[],
    context: ParseItem[] = []
  ): Either<ParseError<Types>, CommandOutput<Types>> {
    const parsedArguments = argparse(argv, argparseOptions);
    parsedArguments.named = Object.assign(
      {},
      defaultValues,
      parsedArguments.named
    );
    if (parsedArguments.named['h'] || parsedArguments.named['help']) {
      showHelp(context);
    }

    return either.mapLeft(decodeArgParse(parsedArguments, type), errors => {
      return {
        ...errors,
        parsed: {
          ...errors.parsed,
          context: [...context, ...errors.parsed.context],
        },
      };
    });
  }

  return { parse, description };
}

/**
 * Ensures that there's only one value provided for the argument.
 *
 * Takes an `io-ts` decoder that parses `A => B` and returns a decoder that parses `A[] => B`
 * and fails if there are more or less than one item.
 */
export const single = tupleWithOneElement;
