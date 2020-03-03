import { AstNode, parse } from '../newparser/parser';
import { tokenize } from '../newparser/tokenizer';
import { errorBox } from './errorBox';

export type Nodes = AstNode[];

export type ParsingError = {
  nodes: AstNode[];
  message: string;
};

export type FailedParse = {
  outcome: 'failure';
  errors: ParsingError[];
};

export type SuccessfulParse<Into> = {
  outcome: 'success';
  value: Into;
};

export type ParseContext = {
  nodes: Nodes;
  visitedNodes: Set<AstNode>;
};

export type ParsingResult<Into> = FailedParse | SuccessfulParse<Into>;

export type RegisterOptions = {
  forceFlagLongNames: Set<string>;
  forceFlagShortNames: Set<string>;
};

export type ArgParser<Into> = {
  parse(context: ParseContext): ParsingResult<Into>;
  register(opts: RegisterOptions): void;
};

export type ParsingInto<AP extends ArgParser<any>> = AP extends ArgParser<
  infer R
>
  ? R
  : never;

export function argparse<AP extends ArgParser<any>>(
  ap: AP,
  strings: string[]
): ParsingInto<AP> {
  const longOptionKeys = new Set<string>();
  const shortOptionKeys = new Set<string>();
  ap.register({
    forceFlagShortNames: shortOptionKeys,
    forceFlagLongNames: longOptionKeys,
  });

  const tokens = tokenize(strings);
  const nodes = parse(tokens, { longOptionKeys, shortOptionKeys });

  const result = ap.parse({ nodes, visitedNodes: new Set() });

  if (result.outcome === 'failure') {
    console.error(errorBox(nodes, result.errors));
    process.exit(1);
  } else {
    return result.value;
  }
}
