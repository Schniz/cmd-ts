import { PrintHelp, Versioned } from './helpdoc';
import { ParseContext, ParsingResult, Register } from './argparser';
import { tokenize } from './newparser/tokenizer';
import { parse } from './newparser/parser';
import { errorBox } from './errorBox';
import { err, ok, Result, isErr } from './Result';

export type Handling<Values, Result> = { handler: (values: Values) => Result };

export type Runner<HandlerArgs, HandlerResult> = PrintHelp &
  Partial<Versioned> &
  Register &
  Handling<HandlerArgs, HandlerResult> & {
    run(context: ParseContext): Promise<ParsingResult<HandlerResult>>;
  };

export type Into<R extends Runner<any, any>> = R extends Runner<any, infer X>
  ? X
  : never;

export async function run<R extends Runner<any, any>>(
  ap: R,
  strings: string[]
): Promise<Into<R>> {
  const result = await runNoExit(ap, strings);
  if (isErr(result)) {
    console.error(result.error);
    process.exit(1);
  } else {
    return result.value;
  }
}

/**
 * Run a command but don't quit. Returns an `Result` instead.
 */
export async function runNoExit<R extends Runner<any, any>>(
  ap: R,
  strings: string[]
): Promise<Result<string, Into<R>>> {
  const longOptionKeys = new Set<string>();
  const shortOptionKeys = new Set<string>();
  const hotPath: string[] = [];
  ap.register({
    forceFlagShortNames: shortOptionKeys,
    forceFlagLongNames: longOptionKeys,
  });

  const tokens = tokenize(strings);
  const nodes = parse(tokens, {
    longFlagKeys: longOptionKeys,
    shortFlagKeys: shortOptionKeys,
  });
  const result = await ap.run({ nodes, visitedNodes: new Set(), hotPath });

  if (isErr(result)) {
    return err(errorBox(nodes, result.error.errors, hotPath));
  } else {
    return ok(result.value);
  }
}
