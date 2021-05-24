import chalk from 'chalk';
import { tokenize } from '../src/newparser/tokenizer';
import { parse } from '../src/newparser/parser';
import { errorBox } from '../src/errorBox';
import { option } from '../src/option';
import { number } from './test-types';
import * as Result from '../src/Result';
import { createRegisterOptions } from './createRegisterOptions';

test('works for multiple nodes', async () => {
  const argv = `hello world --some arg --flag --some another --flag --this-is=option -abcde=f -abcde`;

  const tokens = tokenize(argv.split(' '));
  const tree = parse(tokens, createRegisterOptions());

  const opt = option({
    type: number,
    long: 'some',
  });

  const result = await opt.parse({
    nodes: tree,
    visitedNodes: new Set(),
  });

  if (Result.isOk(result)) {
    throw new Error('should fail...');
  }

  const errors = errorBox(tree, result.error.errors, []);
  expect(errors).toMatch('Too many times provided');
});

test('works for a short flag', async () => {
  const argv = `hello world -fn not_a_number hey`;

  const tokens = tokenize(argv.split(' '));
  const tree = parse(tokens, createRegisterOptions());

  const opt = option({
    type: number,
    long: 'some',
    short: 'n',
  });

  const result = await opt.parse({
    nodes: tree,
    visitedNodes: new Set(),
  });

  if (Result.isOk(result)) {
    throw new Error('should fail...');
  }

  const errors = errorBox(tree, result.error.errors, []);
  expect(errors).toMatch(chalk.red('n not_a_number'));
});

test('works for a single node', async () => {
  const argv = `hello world --flag --some not_a_number --flag --this-is=option -abcde=f -abcde`;

  const tokens = tokenize(argv.split(' '));
  const tree = parse(tokens, createRegisterOptions());

  const opt = option({
    type: number,
    long: 'some',
  });

  const result = await opt.parse({
    nodes: tree,
    visitedNodes: new Set(),
  });

  if (Result.isOk(result)) {
    throw new Error('should fail...');
  }

  const errors = errorBox(tree, result.error.errors, []);
  expect(errors).toMatch('Not a number');
});

test('works when no nodes', async () => {
  const argv = `hello world --flag --flag --this-is=option -abcde=f -abcde`;

  const tokens = tokenize(argv.split(' '));
  const tree = parse(tokens, createRegisterOptions());

  const opt = option({
    type: number,
    long: 'some',
  });

  const result = await opt.parse({
    nodes: tree,
    visitedNodes: new Set(),
  });

  if (Result.isOk(result)) {
    throw new Error('should fail...');
  }

  const errors = errorBox(tree, result.error.errors, []);
  expect(errors).toMatch(`No value provided for --some`);
});
