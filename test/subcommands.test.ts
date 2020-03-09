import { flag } from '../src/flag';
import { option } from '../src/option';
import { positional } from '../src/positional';
import { tokenize } from '../src/newparser/tokenizer';
import { parse } from '../src/newparser/parser';
import { command } from '../src/command';
import { subcommands } from '../src/subcommands';
import { string, boolean } from './test-types';

const logMock = jest.fn();

const greeter = command({
  name: 'greeter',
  args: {
    name: positional({ decoder: string, displayName: 'name' }),
    exclaim: flag({ decoder: boolean, long: 'exclaim', short: 'e' }),
    greeting: option({ decoder: string, long: 'greeting', short: 'g' }),
  },
  handler: x => {
    logMock('greeter', x);
  },
});

const howdyPrinter = command({
  name: 'howdy',
  args: {
    name: positional({ decoder: string, displayName: 'name' }),
  },
  handler: x => {
    logMock('howdy', x);
  },
});

const subcmds = subcommands({
  name: 'my-cli',
  cmds: {
    greeter,
    howdy: howdyPrinter,
  },
});

test('chooses one subcommand', () => {
  const argv = `greeter Gal -eg Hello`.split(' ');
  const tokens = tokenize(argv);
  const longOptionKeys = new Set<string>();
  const shortOptionKeys = new Set<string>();
  subcmds.register({
    forceFlagLongNames: longOptionKeys,
    forceFlagShortNames: shortOptionKeys,
  });
  const nodes = parse(tokens, { longOptionKeys, shortOptionKeys });
  const result = subcmds.parse({ nodes, visitedNodes: new Set() });
  const expected: typeof result = {
    outcome: 'success',
    value: {
      args: {
        name: 'Gal',
        exclaim: true,
        greeting: 'Hello',
      },
      command: 'greeter',
    },
  };

  expect(result).toEqual(expected);
});

test('chooses the other subcommand', () => {
  const argv = `howdy joe`.split(' ');
  const tokens = tokenize(argv);
  const longOptionKeys = new Set<string>();
  const shortOptionKeys = new Set<string>();
  subcmds.register({
    forceFlagLongNames: longOptionKeys,
    forceFlagShortNames: shortOptionKeys,
  });
  const nodes = parse(tokens, { longOptionKeys, shortOptionKeys });
  const result = subcmds.parse({ nodes, visitedNodes: new Set() });
  const expected: typeof result = {
    outcome: 'success',
    value: {
      command: 'howdy',
      args: {
        name: 'joe',
      },
    },
  };

  expect(result).toEqual(expected);
});

test('fails when using unknown subcommand', () => {
  const argv = `--hello yes how are you joe`.split(' ');
  const tokens = tokenize(argv);
  const longOptionKeys = new Set<string>();
  const shortOptionKeys = new Set<string>();
  subcmds.register({
    forceFlagLongNames: longOptionKeys,
    forceFlagShortNames: shortOptionKeys,
  });
  const nodes = parse(tokens, { longOptionKeys, shortOptionKeys });
  const result = subcmds.parse({ nodes, visitedNodes: new Set() });
  const expected: typeof result = {
    outcome: 'failure',
    errors: [
      {
        nodes: nodes.filter(x => x.raw === 'how'),
        message: `Not a valid subcommand name`,
      },
    ],
    partialValue: {},
  };

  expect(result).toEqual(expected);
});

test('fails for a subcommand argument parsing issue', () => {
  const argv = `greeter Gal -g Hello --exclaim=hell-no`.split(' ');
  const tokens = tokenize(argv);
  const longOptionKeys = new Set<string>();
  const shortOptionKeys = new Set<string>();
  subcmds.register({
    forceFlagLongNames: longOptionKeys,
    forceFlagShortNames: shortOptionKeys,
  });
  const nodes = parse(tokens, { longOptionKeys, shortOptionKeys });
  const result = subcmds.parse({ nodes, visitedNodes: new Set() });
  const expected = {
    outcome: 'failure',
    errors: [
      {
        nodes: nodes.filter(x => x.raw.includes('hell-no')),
        message: `expected value to be either "true" or "false". got: "hell-no"`,
      },
    ],
    partialValue: {
      command: 'greeter',
      args: {
        greeting: 'Hello',
        name: 'Gal',
      },
    },
  };

  expect(result).toEqual(expected);
});
