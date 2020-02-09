import * as t from 'io-ts';
import {
  command,
  single,
  named,
  positional,
  boolean,
  bool,
} from '../src/command';
import {
  ReadStream,
  readStreamToString,
  IntOfStr,
} from '../src/example/test-types';
import tempy from 'tempy';
import fs from 'fs';
import { expectToBeRight, expectToBeLeft } from './fp-ts-helpers';

describe('multiple named arguments', () => {
  const app = command({
    numbers: named({ long: 'number', short: 'n', type: t.array(IntOfStr) }),
  });

  it('collects all the named arguments', () => {
    const parsed = app.parse([
      '--number=1',
      '-n=2',
      '--number',
      '3',
      '-n',
      '4',
    ]);
    expectToBeRight(parsed);
    expect(parsed.right[0].numbers).toEqual([1, 2, 3, 4]);
  });

  it('throws an error on malformed input', () => {
    const parsed = app.parse(['--number', 'heyho']);
    expectToBeLeft(parsed);
    expect(parsed.left.parsed.named.numbers).toEqual(['heyho']);
  });
});

describe('a simple command using a stream', () => {
  const app = command({
    stream: named({ long: 'stream', type: single(ReadStream) }),
  });

  it('stream works with urls', async () => {
    const parsed = app.parse(['--stream', 'https://example.com']);
    expectToBeRight(parsed);
    const result = await readStreamToString(parsed.right[0].stream);
    expect(result).toMatch('<h1>Example Domain</h1>');
  });

  it('stream works with files', async () => {
    const tmpfile = tempy.file();
    fs.writeFileSync(tmpfile, 'hello world!!!');
    const parsed = app.parse(['--stream', tmpfile]);
    expectToBeRight(parsed);
    const result = await readStreamToString(parsed.right[0].stream);
    expect(result).toEqual('hello world!!!');
  });

  it('stream works with stdin', async () => {
    const tmpfile = tempy.file();
    fs.writeFileSync(tmpfile, "hello world!!!\nwhat's up?");
    (global as any).mockStdin = fs.createReadStream(tmpfile);
    const parsed = app.parse(['--stream', '-']);
    expectToBeRight(parsed);
    const result = await readStreamToString(parsed.right[0].stream);
    expect(result).toEqual("hello world!!!\nwhat's up?");
  });
});

describe('a command with positional arguments', () => {
  const app = command({
    name: positional({ type: t.string }),
    greeting: named({
      type: single(t.string),
      long: 'greeting',
      defaultValue: 'Hello',
    }),
    noExclaim: boolean({
      type: single(bool),
      description: 'drop the exclamation mark',
      long: 'no-exclaim',
    }),
  });

  it(`fails when a positional argument is missing`, () => {
    const parsed = app.parse([]);
    expectToBeLeft(parsed);
  });

  it('has a default value', () => {
    const parsed = app.parse(['world']);
    expectToBeRight(parsed);
    const [{ name, greeting, noExclaim }] = parsed.right;
    expect({ name, greeting, noExclaim }).toEqual({
      greeting: 'Hello',
      name: 'world',
      noExclaim: false,
    });
  });

  it('can get a greeting', () => {
    const parsed = app.parse(['--no-exclaim', 'world', '--greeting=Welcome']);
    expectToBeRight(parsed);
    const [{ name, greeting, noExclaim }] = parsed.right;
    expect({ name, greeting, noExclaim }).toEqual({
      greeting: 'Welcome',
      name: 'world',
      noExclaim: true,
    });
  });

  it('order of named/positional does not matter', () => {
    const parsed = app.parse(['--greeting=Welcome', 'world', '--no-exclaim']);
    expectToBeRight(parsed);
    const [{ name, greeting, noExclaim }] = parsed.right;
    expect({ name, greeting, noExclaim }).toEqual({
      greeting: 'Welcome',
      name: 'world',
      noExclaim: true,
    });
  });
});

describe('command help', () => {
  const app = command(
    {
      posWODisplay: positional({ type: t.string }),
      posWithDisplay: positional({
        type: t.string,
        displayName: 'PositionalWithDisplayName',
        description: 'pos argument with a display name',
      }),
      plainNamed: named({
        type: single(t.string),
        argumentName: 'pokemon name',
      }),
      namedWithLong: named({
        type: single(t.string),
        long: 'named-with-long',
      }),
      namedWithShort: named({
        type: single(t.string),
        short: 'p',
        description: 'a short, named argument',
      }),
      namedWithLongAndShort: named({
        type: single(t.string),
        long: 'named-with-long-and-short',
        short: 'x',
        env: 'HOWDY',
      }),
      namedWithDefaultValue: named({
        type: single(t.string),
        long: 'named-with-default-value',
        defaultValue: 'DEFAULT_VALUE',
      }),
      noExclaim: boolean({
        type: single(bool),
        description: 'drop the exclamation mark',
        long: 'no-exclaim',
      }),
      verbose: boolean({
        type: single(bool),
        description: 'silly logging',
      }),
    },
    'Some description'
  );

  it('prints help', () => {
    let log = '';
    jest.spyOn(console, 'log').mockImplementation((...v) => {
      log += '\n' + v.join(' ');
    });
    jest.spyOn(console, 'error').mockImplementation((...v) => {
      log += '\n' + v.join(' ');
    });
    jest.spyOn(process, 'exit').mockImplementation(() => {
      return ({} as any) as never;
    });
    app.parse(['--help']);
    expect(log).toEqual(expect.any(String));
    // expect(log.trim()).toMatchSnapshot();
  });
});
