import { ParseItem, ArgParserResult } from './argparse';
import { Either } from 'fp-ts/lib/Either';
import { TypeRecord, TRErrors } from './composedType';

/**
 * A parsing error. Used in `prettyPrint`.
 */
export type ParseError<TR extends TypeRecord, CommandConfig = any> = {
  parsed: ArgParserResult;
  errors: TRErrors<TR>;
  commandConfig: CommandConfig;
};

/**
 * Returns the value a parser resolves into
 */
export type Into<P extends Parser<any>> = P extends Parser<infer Into>
  ? Into
  : never;

/**
 * A command line argument parser
 */
export type Parser<Into = unknown> = {
  /** Parse strings into values */
  parse(
    /**
     * string arguments to parse
     */
    argv: string[],
    /**
     * An optional context.
     * Provided by the parsing combinators, like `binaryParser` and `subcommands`
     * to reserve the already-parsed context in the error messages.
     */
    context?: ParseItem[]
  ): Either<ParseError<TypeRecord>, Into>;

  /**
   * Description provided for the specific parser
   */
  description?: string;
};
