import { subcommands, parse, command, single, bool, t } from '../src';
import {
  ReadStream,
  readStreamToString,
  Integer,
} from '../src/example/test-types';
import tempy from 'tempy';
import fs from 'fs';
import { expectToBeRight, expectToBeLeft } from './fp-ts-helpers';

describe('multiple named arguments', () => {
  const app = command({
    numbers: {
      kind: 'named',
      long: 'number',
      short: 'n',
      type: t.array(Integer),
    },
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
    stream: { kind: 'named', long: 'stream', type: single(ReadStream) },
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
    name: { kind: 'positional', type: t.string },
    greeting: {
      kind: 'named',
      type: single(t.string),
      long: 'greeting',
      defaultValue: 'Hello',
    },
    noExclaim: {
      kind: 'boolean',
      type: single(bool),
      description: 'drop the exclamation mark',
      long: 'no-exclaim',
    },
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
      posWODisplay: { kind: 'positional', type: Integer },
      posWithDisplay: {
        kind: 'positional',
        type: t.string,
        displayName: 'PositionalWithDisplayName',
        description: 'pos argument with a display name',
      },
      plainNamed: {
        kind: 'named',
        type: single(t.string),
        argumentName: 'pokemon name',
      },
      namedWithLong: {
        kind: 'named',
        type: single(t.string),
        long: 'named-with-long',
      },
      namedWithShort: {
        kind: 'named',
        type: single(t.string),
        short: 'p',
        description: 'a short, named argument',
      },
      namedWithLongAndShort: {
        kind: 'named',
        type: single(t.string),
        long: 'named-with-long-and-short',
        short: 'x',
        env: 'HOWDY',
      },
      namedWithDefaultValue: {
        kind: 'named',
        type: single(t.string),
        long: 'named-with-default-value',
        defaultValue: 'DEFAULT_VALUE',
      },
      noExclaim: {
        kind: 'boolean',
        type: single(bool),
        description: 'drop the exclamation mark',
        long: 'no-exclaim',
      },
      verbose: {
        kind: 'boolean',
        type: single(bool),
        description: 'silly logging',
      },
    },
    'Some description'
  );

  it('prints help', () => {
    const { log } = spyCli();
    expect(() => {
      parse(app, ['--help']);
    }).toThrow('process.exit(1)');
    expect(log()).toEqual(expect.any(String));
    // expect(log.trim()).toMatchSnapshot();
  });

  it('fails to parse', () => {
    const { log } = spyCli();
    expect(() => {
      parse(app, []);
    }).toThrow('process.exit(1)');
    expect(log()).toEqual(expect.any(String));
  });

  it('fails to parse with force positional', () => {
    const { log } = spyCli();
    expect(() => {
      parse(app, ['10 in --the way -- she goes']);
    }).toThrow('process.exit(1)');
    expect(log()).toEqual(expect.any(String));
  });
});

describe('subcommands', () => {
  const hello = command({ name: { kind: 'positional', type: t.string } });
  const greet = command({
    greeting: { kind: 'positional', type: t.string },
    name: { kind: 'positional', type: t.string },
  });
  const app = subcommands({
    hello,
    greet,
  });

  it('parses a subcommand', () => {
    const result = parse(app, ['hello', 'gal']);
    expect(result.command).toEqual('hello');
    expect(result.args[0]).toEqual({ name: 'gal' });
  });

  it('parses another subcommand', () => {
    const result = parse(app, ['greet', 'hello', 'gal']);
    expect(result.command).toEqual('greet');
    expect(result.args[0]).toEqual({ greeting: 'hello', name: 'gal' });
  });

  it('shows help', () => {
    const { log } = spyCli();
    expect(() => {
      parse(app, ['--help']);
    }).toThrow('process.exit(1)');
    expect(log()).toContain('hello');
    expect(log()).toContain('greet');
  });

  it('shows an error when a command is not found', () => {
    const { error } = spyCli();
    expect(() => {
      parse(app, ['unknown-command']);
    }).toThrow('process.exit(1)');
    expect(error()).toContain(
      'Not a valid command. Must be one of: hello,greet'
    );
  });
});

function spyCli() {
  let log = '';
  let all = '';
  let error = '';

  jest.spyOn(console, 'log').mockImplementation((...v) => {
    all += '\n' + v.join(' ');
    log += '\n' + v.join(' ');
  });
  jest.spyOn(console, 'error').mockImplementation((...v) => {
    all += '\n' + v.join(' ');
    error += '\n' + v.join(' ');
  });
  jest.spyOn(process, 'exit').mockImplementation(n => {
    throw new Error(`process.exit(${n})`);
  });

  return {
    log() {
      return log.trim();
    },
    error() {
      return error.trim();
    },
    all() {
      return all.trim();
    },
  };
}
