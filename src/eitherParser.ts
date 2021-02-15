import {
  ArgParser,
  FailedParse,
  ParsingInto,
  ParsingResult,
} from './argparser';
import { ProvidesHelp } from './helpdoc';
import * as Result from './Result';

export function eitherParser<
  AP1 extends ArgParser<any> & Partial<ProvidesHelp>,
  AP2 extends ArgParser<any> & Partial<ProvidesHelp>
>(
  parser1: AP1,
  parser2: AP2
): ArgParser<ParsingInto<AP1> | ParsingInto<AP2>> & ProvidesHelp {
  return {
    helpTopics() {
      return [
        ...(parser1.helpTopics?.() ?? []),
        ...(parser2.helpTopics?.() ?? []),
      ];
    },
    register(opts) {
      parser1.register?.(opts);
      parser2.register?.(opts);
    },
    async parse(
      context
    ): Promise<ParsingResult<ParsingInto<AP1> | ParsingInto<AP2>>> {
      const [result1, result2] = await Promise.all([
        parser1.parse(context),
        parser2.parse(context),
      ]);

      if (Result.isErr(result1) && Result.isErr(result2)) {
        return Result.err<FailedParse>({
          errors: [...result1.error.errors, ...result2.error.errors],
        });
      }

      if (Result.isOk(result1) && Result.isOk(result2)) {
        return Result.err<FailedParse>({
          errors: [
            {
              nodes: [...result1.value.nodes, ...result2.value.nodes],
              message: `Got two conflicting arguments`,
            },
          ],
        });
      }

      if (Result.isOk(result1)) {
        return result1;
      }

      return result2;
    },
  };
}
