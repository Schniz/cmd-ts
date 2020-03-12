import execa from 'execa';
import path from 'path';

test('help for subcommands', async () => {
  const result = await runApp(['--help']);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('invalid subcommand', async () => {
  const result = await runApp(['subcommand-that-doesnt-exist']);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('help for complex command', async () => {
  const result = await runApp(['complex', '--help']);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('too many arguments', async () => {
  const result = await runApp([
    '--this=will-be-an-error',
    'cat',
    path.relative(process.cwd(), path.join(__dirname, '../package.json')),
    'also this',
    '--and-also-this',
  ]);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('composes errors', async () => {
  const result = await runApp([
    'greet',
    '--times=not-a-number',
    'not-capitalized',
  ]);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('multiline error', async () => {
  const result = await runApp(['greet', 'Bon Jovi']);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('help for composed subcommands', async () => {
  const result = await runApp(['composed', '--help']);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('help for composed subcommand', async () => {
  const result = await runApp(['composed', 'cat', '--help']);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('asynchronous type conversion works for failures', async () => {
  const result = await runApp(['composed', 'cat', 'https://httpstat.us/404']);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(1);
});

test('asynchronous type conversion works for success', async () => {
  const result = await runApp(['composed', 'cat', 'https://httpstat.us/200']);
  expect(result.all).toMatchSnapshot();
  expect(result.exitCode).toBe(0);
});

async function runApp(args: string[]) {
  jest.setTimeout(10000);
  const scriptPath = path.join(__dirname, '../example/app.ts');
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
}
