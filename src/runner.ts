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
  try {
    const result = await runNoExit(ap, strings, false);
    if (isErr(result)) {
      console.error(result.error);
      process.exit(1);
    } else {
      return result.value;
    }
  } catch (e) {
    if (e instanceof Exit) {
      if (e.config.into === 'stderr') {
        console.error(e.config.message);
      } else {
        console.log(e.config.message);
      }
      process.exit(e.config.exitCode);
    }
    throw e;
  }
}

/**
 * Run a command but don't quit. Returns an `Result` instead.
 */
export async function runNoExit<R extends Runner<any, any>>(
  ap: R,
  strings: string[],
  catchExits: boolean
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

  try {
    const result = await ap.run({ nodes, visitedNodes: new Set(), hotPath });

    if (isErr(result)) {
      return err(errorBox(nodes, result.error.errors, hotPath));
    } else {
      return ok(result.value);
    }
  } catch (e) {
    if (catchExits && e instanceof Exit) {
      return err(e.config.message);
    }
    throw e;
  }
}
