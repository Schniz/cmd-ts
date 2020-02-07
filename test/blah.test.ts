import * as t from 'io-ts';
import { command, single, named } from '../src/command';
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
