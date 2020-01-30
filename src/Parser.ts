import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { NormalizedMinimist } from './normalMinimist';
import { ParsingContext } from './ParsingContext';

export interface Parser<Into> {
  type(): t.Type<Into, NormalizedMinimist>;

  parse(
    args: NormalizedMinimist,
    context?: ParsingContext
  ): Either<ParseError, Into>;
}

export type Into<P extends Parser<any>> = ReturnType<P['parse']> extends Either<
  any,
  infer R
>
  ? R
  : never;

export interface ParseError {
  validationErrors: t.Errors;
  parsed: NormalizedMinimist;
  context: ParsingContext;
}
