import { ParseItem, ArgParserResult } from './argparse';
import { Either } from 'fp-ts/lib/Either';
import { TypeRecord, TRErrors } from './composedType';

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
  parse(
    argv: string[],
    context?: ParseItem[]
  ): Either<ParseError<TypeRecord>, Into>;
  description?: string;
};
