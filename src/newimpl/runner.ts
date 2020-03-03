import { PrintHelp, Versioned } from './helpdoc';
import { ArgParser, ParseContext, ParsingResult } from './argparser';
import { tokenize } from '../newparser/tokenizer';
import { parse } from '../newparser/parser';
import { errorBox } from './errorBox';

export type Runner<Into> = PrintHelp &
  Partial<Versioned> &
  ArgParser<Into> & {
    run(
      context: ParseContext
    ):
      | {
          type: 'circuitbreaker';
          value: 'help' | 'version';
        }
      | { type: 'parsing'; value: ParsingResult<Into> };
  };
export type Into<R extends Runner<any>> = R extends Runner<infer X> ? X : never;

export function run<R extends Runner<any>>(ap: R, strings: string[]): Into<R> {
  const longOptionKeys = new Set<string>();
  const shortOptionKeys = new Set<string>();
  ap.register({
    forceFlagShortNames: shortOptionKeys,
    forceFlagLongNames: longOptionKeys,
  });

  const tokens = tokenize(strings);
  const nodes = parse(tokens, { longOptionKeys, shortOptionKeys });
  const result = ap.run({ nodes, visitedNodes: new Set() });

  if (result.type === 'circuitbreaker') {
    if (result.value === 'help') {
      ap.printHelp();
      process.exit(1);
    }

    if (result.value === 'version') {
      console.log(ap.version ?? 'No version provided');
      process.exit(0);
    }

    throw new Error('unknown circuitbreaker');
  } else {
    if (result.value.outcome === 'failure') {
      console.error(errorBox(nodes, result.value.errors));
      process.exit(1);
    } else {
      return result.value.value;
    }
  }
}
