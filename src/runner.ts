import { type Result, err, isErr, ok } from "./Result";
import type {
	ArgParser,
	ParseContext,
	ParsingResult,
	Register,
} from "./argparser";
import { Exit } from "./effects";
import { errorBox } from "./errorBox";
import type { PrintHelp, Versioned } from "./helpdoc";
import { type AstNode, parse as doParse } from "./newparser/parser";
import { tokenize } from "./newparser/tokenizer";

export type Handling<Values, Result> = { handler: (values: Values) => Result };

export type Runner<HandlerArgs, HandlerResult> = PrintHelp &
	Partial<Versioned> &
	Register &
	Handling<HandlerArgs, HandlerResult> &
	ArgParser<HandlerArgs> & {
		run(context: ParseContext): Promise<ParsingResult<HandlerResult>>;
	};

export type Into<R extends Runner<any, any>> = R extends Runner<any, infer X>
	? X
	: never;

export async function run<R extends Runner<any, any>>(
	ap: R,
	strings: string[],
): Promise<Into<R>> {
	const result = await runSafely(ap, strings);
	if (isErr(result)) {
		return result.error.run();
	}
	return result.value;
}

/**
 * Runs a command but does not apply any effect
 */
export async function runSafely<R extends Runner<any, any>>(
	ap: R,
	strings: string[],
): Promise<Result<Exit, Into<R>>> {
	const hotPath: string[] = [];
	const nodes = parseCommon(ap, strings);

	try {
		const result = await ap.run({ nodes, visitedNodes: new Set(), hotPath });

		if (isErr(result)) {
			throw new Exit({
				message: errorBox(nodes, result.error.errors, hotPath),
				exitCode: 1,
				into: "stderr",
			});
		}
		return ok(result.value);
	} catch (e) {
		if (e instanceof Exit) {
			return err(e);
		}
		throw e;
	}
}

/**
 * Run a command but don't quit. Returns an `Result` instead.
 */
export async function dryRun<R extends Runner<any, any>>(
	ap: R,
	strings: string[],
): Promise<Result<string, Into<R>>> {
	const result = await runSafely(ap, strings);
	if (isErr(result)) {
		return err(result.error.dryRun());
	}
	return result;
}

/**
 * Parse the command as if to run it, but only return the parse result and don't run the command.
 */
export function parse<R extends Runner<any, any>>(
	ap: R,
	strings: string[],
): Promise<ParsingResult<any>> {
	const hotPath: string[] = [];
	const nodes = parseCommon(ap, strings);
	return ap.parse({ nodes, visitedNodes: new Set(), hotPath });
}

function parseCommon<R extends Runner<any, any>>(
	ap: R,
	strings: string[],
): AstNode[] {
	const longFlagKeys = new Set<string>();
	const shortFlagKeys = new Set<string>();
	const longOptionKeys = new Set<string>();
	const shortOptionKeys = new Set<string>();
	const registerContext = {
		forceFlagShortNames: shortFlagKeys,
		forceFlagLongNames: longFlagKeys,
		forceOptionShortNames: shortOptionKeys,
		forceOptionLongNames: longOptionKeys,
	};

	ap.register(registerContext);

	const tokens = tokenize(strings);
	return doParse(tokens, registerContext);
}
