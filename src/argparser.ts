import { AstNode } from "./newparser/parser";
import { Result } from "./Result";

export type Nodes = AstNode[];

export type ParsingError = {
	/** Relevant nodes that should be shown with the message provided */
	nodes: AstNode[];
	/** Why did the parsing failed? */
	message: string;
};

export type FailedParse = {
	errors: ParsingError[];
	/** The content that was parsed so far */
	partialValue?: unknown;
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

export type ParsingResult<Into> = Result<FailedParse, Into>;

/**
 * A weird thing about command line interfaces is that they are not consistent without some context.
 * Consider the following argument list: `my-app --server start`
 *
 * Should we parse it as `[positional my-app] [option --server start]`
 * or should we parse it as `[positional my-app] [flag --server] [positional start]`?
 *
 * The answer is — it depends. A good command line utility has the context to know which key is a flag
 * and which is an option that can take a value. We aim to be a good command line utility library, so
 * we need to have the ability to provide this context.
 *
 * This is the small object that has this context.
 */
export type RegisterOptions = {
	forceFlagLongNames: Set<string>;
	forceFlagShortNames: Set<string>;
	forceOptionLongNames: Set<string>;
	forceOptionShortNames: Set<string>;
};

export type Register = {
	/**
	 * Inform the parser with context before parsing.
	 * Right now, only used to force flags in the parser.
	 */
	register(opts: RegisterOptions): void;
};

export type ArgParser<Into> = Partial<Register> & {
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
