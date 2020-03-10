import { AstNode } from './newparser/parser';

export type Nodes = AstNode[];

export type ParsingError = {
  nodes: AstNode[];
  message: string;
};

export type DeepPartial<X> = {
  [key in keyof X]?: DeepPartial<X[key]>;
};

export type FailedParse<Into> = {
  outcome: 'failure';
  errors: ParsingError[];
  partialValue?: DeepPartial<Into>;
};

export type SuccessfulParse<Into> = {
  outcome: 'success';
  value: Into;
};

export type ParseContext = {
  nodes: Nodes;
  visitedNodes: Set<AstNode>;
  hotPath?: string[];
};

export type ParsingResult<Into> = FailedParse<Into> | SuccessfulParse<Into>;

export type RegisterOptions = {
  forceFlagLongNames: Set<string>;
  forceFlagShortNames: Set<string>;
};

export type Register = {
  register(opts: RegisterOptions): void;
};

export type ArgParser<Into> = Register & {
  parse(context: ParseContext): Promise<ParsingResult<Into>>;
};

export type ParsingInto<AP extends ArgParser<any>> = AP extends ArgParser<
  infer R
>
  ? R
  : never;
