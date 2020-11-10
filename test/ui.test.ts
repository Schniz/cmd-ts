import execa, { ExecaReturnValue } from 'execa';
import path from 'path';

test('help for subcommands', async () => {
  const result = await runApp1(['--help']);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('invalid subcommand', async () => {
  const result = await runApp1(['subcommand-that-doesnt-exist']);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('help for complex command', async () => {
  const result = await runApp1(['complex', '--help']);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('too many arguments', async () => {
  const result = await runApp1([
    '--this=will-be-an-error',
    'cat',
    path.relative(process.cwd(), path.join(__dirname, '../package.json')),
    'also this',
    '--and-also-this',
  ]);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('suggests a subcommand on typo', async () => {
  const result = await runApp1([
    'greek',
  ]);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('composes errors', async () => {
  const result = await runApp1([
    'greet',
    '--times=not-a-number',
    'not-capitalized',
  ]);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('multiline error', async () => {
  const result = await runApp1(['greet', 'Bon Jovi']);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('help for composed subcommands', async () => {
  const result = await runApp1(['composed', '--help']);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('help for composed subcommand', async () => {
  const result = await runApp1(['composed', 'cat', '--help']);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('asynchronous type conversion works for failures', async () => {
  const result = await runApp1(['composed', 'cat', 'https://httpstat.us/404']);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('asynchronous type conversion works for success', async () => {
  const result = await runApp1(['composed', 'cat', 'https://httpstat.us/200']);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(0);
});

test('subcommands show their version', async () => {
  const result = await runApp1(['--version']);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(0);
});

test('failures in defaultValue', async () => {
  const result = await runApp2([]);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('subcommands with process.argv.slice(2)', async () => {
  const result = await runApp3(['--help']);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
})

const runApp1 = app(path.join(__dirname, '../example/app.ts'));
const runApp2 = app(path.join(__dirname, '../example/app2.ts'));
const runApp3 = app(path.join(__dirname, '../example/app3.ts'));

function app(
  scriptPath: string
): (args: string[]) => Promise<ExecaReturnValue> {
  return async args => {
    jest.setTimeout(10000);
    const result = await execa(
      path.join(__dirname, '../scripts/ts-node'),
      [scriptPath, ...args],
      {
        all: true,
        reject: false,
        env: {
          FORCE_COLOR: 'true',
        },
      }
    );
    return result;
  };
}
