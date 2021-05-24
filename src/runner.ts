import { PrintHelp, Versioned } from './helpdoc';
import { ParseContext, ParsingResult, Register } from './argparser';
import { tokenize } from './newparser/tokenizer';
import { parse } from './newparser/parser';
import { errorBox } from './errorBox';
import { err, ok, Result, isErr } from './Result';
import { Exit } from './effects';

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
  const result = await runSafely(ap, strings);
  if (isErr(result)) {
    return result.error.run();
  } else {
    return result.value;
  }
}

/**
 * Runs a command but does not apply any effect
 */
export async function runSafely<R extends Runner<any, any>>(
  ap: R,
  strings: string[]
): Promise<Result<Exit, Into<R>>> {
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

  try {
    const result = await ap.run({ nodes, visitedNodes: new Set(), hotPath });

    if (isErr(result)) {
      throw new Exit({
        message: errorBox(nodes, result.error.errors, hotPath),
        exitCode: 1,
        into: 'stderr',
      });
    } else {
      return ok(result.value.value);
    }
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
  strings: string[]
): Promise<Result<string, Into<R>>> {
  const result = await runSafely(ap, strings);
  if (isErr(result)) {
    return err(result.error.dryRun());
  } else {
    return result;
  }
}
