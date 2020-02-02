import { command, single } from '../src/CommandBuilder4';
import { ReadStream, readStreamToString } from '../src/example/test-types';
import tempy from 'tempy';
import fs from 'fs';
import { expectToBeRight } from '../src/jest-fp-ts';

describe('blah', () => {
  const app = command({
    stream: single({ long: 'stream', type: ReadStream, kind: 'named' }),
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
