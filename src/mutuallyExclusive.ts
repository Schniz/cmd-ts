import {
  ArgParser,
  FailedParse,
  ParsingInto,
  ParsingResult,
} from './argparser';
import { ProvidesHelp } from './helpdoc';
import * as Result from './Result';
import { flatMap } from './utils';

type BaseOptionBag = Record<string, ArgParser<any> & Partial<ProvidesHelp>>;

export function mutuallyExclusive<OptionBag extends BaseOptionBag>(
  bag: OptionBag
): ArgParser<
  {
    [key in keyof OptionBag]: { name: key; value: ParsingInto<OptionBag[key]> };
  }[keyof OptionBag]
> &
  ProvidesHelp {
  return {
    helpTopics() {
      return flatMap(
        Object.values(bag),
        (parser) => parser.helpTopics?.() ?? []
      );
    },
    register(opts) {
      for (const parser of Object.values(bag)) {
        parser.register?.(opts);
      }
    },
    async parse(
      context
    ): Promise<
      ParsingResult<
        {
          [key in keyof OptionBag]: {
            name: key;
            value: ParsingInto<OptionBag[key]>;
          };
        }[keyof OptionBag]
      >
    > {
      const promises = Object.entries(bag).map(
        async ([name, parser]): Promise<
          ParsingResult<{ name: string; value: any }>
        > => {
          const result = await parser.parse(context);
          if (Result.isOk(result)) {
            return Result.ok({
              nodes: result.value.nodes,
              value: {
                name,
                value: result.value.value,
              },
              generatedFromDefault: result.value.generatedFromDefault,
            });
          } else {
            return Result.err(result.error);
          }
        }
      );

      const allResults = await Promise.all(promises);
      const allOkResults = allResults.filter(Result.isOk);
      const allOkThatAreNotDefault = allOkResults.filter(
        (x) => !x.value.generatedFromDefault
      );

      if (allOkThatAreNotDefault.length > 1) {
        return Result.err<FailedParse>({
          errors: [
            {
              nodes: flatMap(allOkResults, (result) => result.value.nodes),
              message: `Got conflicting arguments`,
            },
          ],
        });
      }

      if (allOkResults.length === 0) {
        return Result.err<FailedParse>({
          errors: flatMap(allResults, (result) => {
            if (Result.isOk(result)) {
              throw new Error('impossible state');
            }
            return result.error.errors;
          }),
        });
      }

      return allOkThatAreNotDefault[0] ?? allOkResults[0];
    },
  };
}
