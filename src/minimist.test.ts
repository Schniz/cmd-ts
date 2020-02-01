import { minimist, MinimistResult } from './minimist';

test('works', () => {
  const result = minimist(
    [
      'hello',
      '--number',
      '10',
      '-n',
      '20',
      '--skippable-boolean',
      '--boolean',
      'world',
      '--one-word=yes',
      '-w=yesyes',
      '--',
      'my',
      '--friends',
    ],
    {
      short: {
        n: 'someNumber',
        w: 'oneWord',
      },
      long: {
        number: 'someNumber',
        boolean: 'boolean',
        'one-word': 'oneWord',
      },
      forceBoolean: new Set(['boolean']),
      positional: { 0: 'greeting' }
    }
  );
  expect(result).toEqual({
    named: {
      someNumber: ['10', '20'],
      boolean: ['true'],
      'skippable-boolean': ['true'],
      oneWord: ['yes', 'yesyes'],
      greeting: ['hello'],
    },
    positional: ['world', 'my', '--friends'],
    context: [
      {
        forced: false,
        type: 'positional',
        position: 0,
        input: 'hello',
        name: 'greeting',
      },
      {
        type: 'namedArgument',
        inputValue: '10',
        inputKey: '--number',
        key: 'someNumber',
        value: '10',
        skipped: false,
      },
      {
        type: 'namedArgument',
        inputValue: '20',
        inputKey: '-n',
        key: 'someNumber',
        value: '20',
        skipped: false,
      },
      {
        type: 'namedArgument',
        key: 'skippable-boolean',
        skipped: true,
        inputKey: '--skippable-boolean',
        inputValue: undefined,
        value: 'true',
      },
      {
        type: 'namedArgument',
        inputValue: undefined,
        inputKey: '--boolean',
        key: 'boolean',
        value: 'true',
        skipped: false,
      },
      {
        forced: false,
        type: 'positional',
        position: 1,
        input: 'world',
      },
      {
        type: 'namedArgument',
        inputKey: '--one-word=yes',
        inputValue: undefined,
        key: 'oneWord',
        skipped: false,
        value: 'yes',
      },
      {
        type: 'namedArgument',
        inputKey: '-w=yesyes',
        inputValue: undefined,
        key: 'oneWord',
        skipped: false,
        value: 'yesyes',
      },
      {
        type: 'forcePositional',
      },
      { type: 'positional', input: 'my', forced: true, position: 2 },
      { type: 'positional', input: '--friends', forced: true, position: 3 },
    ],
  } as MinimistResult);
});
