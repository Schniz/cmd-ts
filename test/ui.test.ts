import execa from 'execa';
import path from 'path';

test('help for subcommands', async () => {
  const result = await runApp(['--help']);
  expect(result.exitCode).toBe(1);
  expect(result.all).toMatchSnapshot();
});

test('invalid subcommand', async () => {
  const result = await runApp(['subcommand-that-doesnt-exist']);
  expect(result.exitCode).toBe(1);
  expect(result.all).toMatchSnapshot();
});

test('help for complex command', async () => {
  const result = await runApp(['complex', '--help']);
  expect(result.exitCode).toBe(1);
  expect(result.all).toMatchSnapshot();
});

test('too many arguments', async () => {
  const result = await runApp([
    '--this=will-be-an-error',
    'cat',
    path.relative(process.cwd(), path.join(__dirname, '../package.json')),
    'also this',
    '--and-also-this',
  ]);
  expect(result.exitCode).toBe(1);
  expect(result.all).toMatchSnapshot();
});

test('composes errors', async () => {
  const result = await runApp([
    'greet',
    '--times=not-a-number',
    'not-capitalized',
  ]);
  expect(result.exitCode).toBe(1);
  expect(result.all).toMatchSnapshot();
});

test('help for composed subcommands', async () => {
  const result = await runApp(['composed', '--help']);
  expect(result.exitCode).toBe(1);
  expect(result.all).toMatchSnapshot();
});

test('help for composed subcommand', async () => {
  const result = await runApp(['composed', 'cat', '--help']);
  expect(result.exitCode).toBe(1);
  expect(result.all).toMatchSnapshot();
});

test('asynchronous type conversion works', async () => {
  const result = await runApp(['composed', 'cat', 'https://httpstat.us/404']);
  expect(result.exitCode).toBe(1);
  expect(result.all).toMatchSnapshot();
});

test('asynchronous type conversion works, when it passes', async () => {
  const result = await runApp(['composed', 'cat', 'https://httpstat.us/200']);
  expect(result.exitCode).toBe(0);
  expect(result.all).toMatchSnapshot();
});

async function runApp(args: string[]) {
  const scriptPath = path.join(__dirname, '../src/example/app.ts');
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
