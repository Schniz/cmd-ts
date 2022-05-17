import { test, expect } from 'vitest';
import { flag } from '../src/flag';
import { tokenize } from '../src/newparser/tokenizer';
import { parse } from '../src/newparser/parser';
import { boolean } from '../src/types';
import * as Result from '../src/Result';
import { createRegisterOptions } from './createRegisterOptions';

test('fails on incompatible value', async () => {
  const argv = `--hello=world`;
  const tokens = tokenize(argv.split(' '));
  const argparser = flag({
    type: boolean,
    long: 'hello',
    description: 'description',
  });
  const registerOptions = createRegisterOptions();
  argparser.register(registerOptions);
  const nodes = parse(tokens, registerOptions);

  const result = argparser.parse({
    nodes,
    visitedNodes: new Set(),
  });

  await expect(result).resolves.toEqual(
    Result.err({
      errors: [
        {
          nodes: nodes,
          message:
            'expected value to be either "true" or "false". got: "world"',
        },
      ],
    })
  );
});

test('defaults to false', async () => {
  const argv = ``;
  const tokens = tokenize(argv.split(' '));
  const argparser = flag({
    type: boolean,
    long: 'hello',
    description: 'description',
  });
  const registerOptions = createRegisterOptions();
  argparser.register(registerOptions);
  const nodes = parse(tokens, registerOptions);

  const result = argparser.parse({
    nodes,
    visitedNodes: new Set(),
  });

  await expect(result).resolves.toEqual(Result.ok(false));
});

test('allows short arguments', async () => {
  const argv = `-abc`;
  const tokens = tokenize(argv.split(' '));
  const argparser = flag({
    type: boolean,
    long: 'hello',
    short: 'b',
    description: 'description',
  });
  const registerOptions = createRegisterOptions();
  argparser.register(registerOptions);
  const nodes = parse(tokens, registerOptions);

  const result = argparser.parse({
    nodes,
    visitedNodes: new Set(),
  });

  await expect(result).resolves.toEqual(Result.ok(true));
});
