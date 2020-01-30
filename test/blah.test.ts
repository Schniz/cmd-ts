import { program } from '../src';
import {
  ensureRight,
  ReadStream,
  readStreamToString,
} from '../src/example/test-types';
import tempy from 'tempy';
import fs from 'fs';

describe('blah', () => {
  it('stream works with urls', async () => {
    const parsed = program()
      .namedArg({ name: 'stream', type: ReadStream })
      .parse(['--stream', 'https://example.com']);
    ensureRight(parsed);
    const result = await readStreamToString(parsed.right.stream);
    expect(result).toMatch('<h1>Example Domain</h1>');
  });
  it('stream works with files', async () => {
    const tmpfile = tempy.file();
    fs.writeFileSync(tmpfile, 'hello world!!!');
    const parsed = program()
      .namedArg({ name: 'stream', type: ReadStream })
      .parse(['--stream', tmpfile]);
    ensureRight(parsed);
    const result = await readStreamToString(parsed.right.stream);
    expect(result).toEqual('hello world!!!');
  });

  it('stream works with stdin', async () => {
    const tmpfile = tempy.file();
    fs.writeFileSync(tmpfile, "hello world!!!\nwhat's up?");
    (global as any).mockStdin = fs.createReadStream(tmpfile);
    const parsed = program()
      .namedArg({ name: 'stream', type: ReadStream })
      .parse(['--stream', '-']);
    ensureRight(parsed);
    const result = await readStreamToString(parsed.right.stream);
    expect(result).toEqual("hello world!!!\nwhat's up?");
  });
});
