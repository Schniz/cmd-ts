import { AstNode } from './newparser/parser';
import { Either } from './either';

export type Nodes = AstNode[];

export type ParsingError = {
  /** Relevant nodes that should be shown with the message provided */
  nodes: AstNode[];
  /** Why did the parsing failed? */
  message: string;
};

/**
 * Like TypeScript's `Partial<T>`, only recursive.
 */
export type DeepPartial<X> = {
  [key in keyof X]?: DeepPartial<X[key]>;
};

export type FailedParse<Into> = {
  errors: ParsingError[];
  /** The content that was parsed so far */
  partialValue?: DeepPartial<Into>;
};

export type ParseContext = {
  /** The nodes we parsed */
  nodes: Nodes;
  /**
   * A set of nodes that were already visited. Helpful when writing a parser,
   * and wanting to skip all the nodes we've already used
   */
  visitedNodes: Set<AstNode>;
  /** The command path breadcrumbs, to print when asking for help */
  hotPath?: string[];
};

export type ParsingResult<Into> = Either<FailedParse<Into>, Into>;

export type RegisterOptions = {
  forceFlagLongNames: Set<string>;
  forceFlagShortNames: Set<string>;
};

export type Register = {
  /**
   * Inform the parser with context before parsing.
   * Right now, only used to force flags in the parser.
   */
  register(opts: RegisterOptions): void;
};

export type ArgParser<Into> = Register & {
  /**
   * Parse from AST nodes into the value provided in [[Into]].
   *
   * @param context The parsing context
   */
  parse(context: ParseContext): Promise<ParsingResult<Into>>;
};

export type ParsingInto<AP extends ArgParser<any>> = AP extends ArgParser<
  infer R
>
  ? R
  : never;
