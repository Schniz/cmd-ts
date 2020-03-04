import { flag } from '../../src/newimpl/flag';
import { tokenize } from '../../src/newparser/tokenizer';
import { parse } from '../../src/newparser/parser';
import { identity } from '../../src/newimpl/from';

test('fails on incompatible value', () => {
  const argv = `--hello=world`;
  const tokens = tokenize(argv.split(' '));
  const shortOptionKeys = new Set<string>();
  const longOptionKeys = new Set<string>();
  const argparser = flag({
    decoder: identity(),
    long: 'hello',
    description: 'description',
  });
  argparser.register({
    forceFlagShortNames: shortOptionKeys,
    forceFlagLongNames: longOptionKeys,
  });
  const nodes = parse(tokens, {
    shortOptionKeys,
    longOptionKeys,
  });

  const result = argparser.parse({
    nodes,
    visitedNodes: new Set(),
  });

  expect(result).toEqual({
    outcome: 'failure',
    errors: [
      {
        nodes: nodes,
        message: 'expected value to be either "true" or "false". got: "world"',
      },
    ],
  });
});

test('defaults to false', () => {
  const argv = ``;
  const tokens = tokenize(argv.split(' '));
  const shortOptionKeys = new Set<string>();
  const longOptionKeys = new Set<string>();
  const argparser = flag({
    decoder: identity(),
    long: 'hello',
    description: 'description',
  });
  argparser.register({
    forceFlagShortNames: shortOptionKeys,
    forceFlagLongNames: longOptionKeys,
  });
  const nodes = parse(tokens, {
    shortOptionKeys,
    longOptionKeys,
  });

  const result = argparser.parse({
    nodes,
    visitedNodes: new Set(),
  });

  expect(result).toEqual({
    outcome: 'success',
    value: false,
  });
});

test('allows short arguments', () => {
  const argv = `-abc`;
  const tokens = tokenize(argv.split(' '));
  const shortOptionKeys = new Set<string>();
  const longOptionKeys = new Set<string>();
  const argparser = flag({
    decoder: identity(),
    long: 'hello',
    short: 'b',
    description: 'description',
  });
  argparser.register({
    forceFlagShortNames: shortOptionKeys,
    forceFlagLongNames: longOptionKeys,
  });
  const nodes = parse(tokens, {
    shortOptionKeys,
    longOptionKeys,
  });

  const result = argparser.parse({
    nodes,
    visitedNodes: new Set(),
  });

  expect(result).toEqual({
    outcome: 'success',
    value: true,
  });
});
