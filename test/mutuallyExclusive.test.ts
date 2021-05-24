import { mutuallyExclusive } from '../src/mutuallyExclusive';
import { flag } from '../src/flag';
import { tokenize } from '../src/newparser/tokenizer';
import { parse } from '../src/newparser/parser';
import {
  ArgParser,
  ParsingError,
  ParsingInto,
  ParsingResult,
} from '../src/argparser';
import * as Result from '../src/Result';
import { boolean, number } from '../src/types';
import { option } from '../src/option';

describe('flags', () => {
  const subject = mutuallyExclusive({
    dev: flag({
      long: 'dev',
      type: { ...boolean, defaultValue: () => true },
    }),
    prod: flag({ long: 'prod' }),
  });

  it('chooses the first one if none selected', async () => {
    const result = await parsingFlow(subject, []);
    expect(result).toEqual(
      Result.ok({
        generatedFromDefault: true,
        nodes: [],
        value: {
          name: 'dev',
          value: true,
        },
      })
    );
  });

  it('chooses whatever is selected', async () => {
    const result = await parsingFlow(subject, ['--dev=false']);
    expect(result).toEqual(
      Result.ok({
        generatedFromDefault: false,
        nodes: expect.any(Array),
        value: {
          name: 'dev',
          value: false,
        },
      })
    );
  });

  it('fails when multiple flags matching', async () => {
    const result = await parsingFlow(subject, ['--dev=false', '--prod']);
    expect(result).toEqual(
      Result.err({
        errors: [
          {
            message: `Got conflicting arguments`,
            nodes: expect.any(Array),
          },
        ],
      })
    );
  });
});

describe('options', () => {
  const subject = mutuallyExclusive({
    name: option({ long: 'name' }),
    age: option({ long: 'age', type: number }),
  });

  it('fails if none were given', async () => {
    const result = await parsingFlow(subject, []);
    expect(result).toEqual<typeof result>(
      Result.err({
        errors: [
          {
            message: 'No value provided for --name',
            nodes: [],
          },
          {
            message: 'No value provided for --age',
            nodes: [],
          },
        ],
      })
    );
  });

  it('fails if too many were given', async () => {
    const result = await parsingFlow(subject, ['--name=hey', '--age=18']);
    expect(result).toEqual<typeof result>(
      Result.err({
        errors: [
          {
            message: 'Got conflicting arguments',
            nodes: expect.any(Array),
          },
        ],
      })
    );
  });

  it('returns the resolved argument', async () => {
    const result = await parsingFlow(subject, ['--age=18']);
    expect(result).toEqual<typeof result>(
      Result.ok({
        value: {
          name: 'age',
          value: 18,
        },
        nodes: expect.any(Array),
        generatedFromDefault: false,
      })
    );
  });
});

function parsingFlow<AP extends ArgParser<any>>(
  cmd: AP,
  strings: string[]
): Promise<ParsingResult<ParsingInto<AP>>> {
  const tokens = tokenize(strings);
  const longOptionKeys = new Set<string>();
  const shortOptionKeys = new Set<string>();
  cmd.register?.({
    forceFlagLongNames: longOptionKeys,
    forceFlagShortNames: shortOptionKeys,
  });
  const nodes = parse(tokens, {
    longFlagKeys: longOptionKeys,
    shortFlagKeys: shortOptionKeys,
  });
  const result = cmd.parse({
    nodes,
    visitedNodes: new Set(),
  });
  return result;
}
