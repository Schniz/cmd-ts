import { PrintHelp, Versioned } from './helpdoc';
import { ParseContext, ParsingResult, Register } from './argparser';
import { tokenize } from './newparser/tokenizer';
import { parse } from './newparser/parser';
import { errorBox } from './errorBox';

export type Handling<Values, Result> = { handler: (values: Values) => Result };

export type Runner<HandlerArgs, HandlerResult> = PrintHelp &
  Partial<Versioned> &
  Register &
  Handling<HandlerArgs, HandlerResult> & {
    run(context: ParseContext): ParsingResult<HandlerResult>;
  };

export type Into<R extends Runner<any, any>> = R extends Runner<any, infer X>
  ? X
  : never;

export function run<R extends Runner<any, any>>(
  ap: R,
  strings: string[]
): Into<R> {
  const longOptionKeys = new Set<string>();
  const shortOptionKeys = new Set<string>();
  const hotPath: string[] = [];
  ap.register({
    forceFlagShortNames: shortOptionKeys,
    forceFlagLongNames: longOptionKeys,
  });

  const tokens = tokenize(strings);
  const nodes = parse(tokens, { longOptionKeys, shortOptionKeys });
  const result = ap.run({ nodes, visitedNodes: new Set(), hotPath });

  if (result.outcome === 'failure') {
    console.error(errorBox(nodes, result.errors, hotPath));
    process.exit(1);
  } else {
    return result.value;
  }
}
