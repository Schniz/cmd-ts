import chalk from 'chalk';
import { tokenize } from '../src/newparser/tokenizer';
import { parse } from '../src/newparser/parser';
import { errorBox } from '../src/errorBox';
import { option } from '../src/option';
import { number } from './test-types';

test('works for multiple nodes', () => {
  const argv = `hello world --some arg --flag --some another --flag --this-is=option -abcde=f -abcde`;

  const tokens = tokenize(argv.split(' '));
  const tree = parse(tokens, {
    longOptionKeys: new Set(),
    shortOptionKeys: new Set(),
  });

  const opt = option({
    decoder: number,
    long: 'some',
  });

  const result = opt.parse({
    nodes: tree,
    visitedNodes: new Set(),
  });

  if (result.outcome === 'success') {
    throw new Error('should fail...');
  }

  const errors = errorBox(tree, result.errors, []);
  expect(errors).toMatch('Too many times provided');
});

test('works for a short flag', () => {
  const argv = `hello world -fn not_a_number hey`;

  const tokens = tokenize(argv.split(' '));
  const tree = parse(tokens, {
    longOptionKeys: new Set(),
    shortOptionKeys: new Set(),
  });

  const opt = option({
    decoder: number,
    long: 'some',
    short: 'n',
  });

  const result = opt.parse({
    nodes: tree,
    visitedNodes: new Set(),
  });

  if (result.outcome === 'success') {
    throw new Error('should fail...');
  }

  const errors = errorBox(tree, result.errors, []);
  expect(errors).toMatch(chalk.red('n not_a_number'));
});

test('works for a single node', () => {
  const argv = `hello world --flag --some not_a_number --flag --this-is=option -abcde=f -abcde`;

  const tokens = tokenize(argv.split(' '));
  const tree = parse(tokens, {
    longOptionKeys: new Set(),
    shortOptionKeys: new Set(),
  });

  const opt = option({
    decoder: number,
    long: 'some',
  });

  const result = opt.parse({
    nodes: tree,
    visitedNodes: new Set(),
  });

  if (result.outcome === 'success') {
    throw new Error('should fail...');
  }

  const errors = errorBox(tree, result.errors, []);
  expect(errors).toMatch('Not a number');
});

test('works when no nodes', () => {
  const argv = `hello world --flag --flag --this-is=option -abcde=f -abcde`;

  const tokens = tokenize(argv.split(' '));
  const tree = parse(tokens, {
    longOptionKeys: new Set(),
    shortOptionKeys: new Set(),
  });

  const opt = option({
    decoder: number,
    long: 'some',
  });

  const result = opt.parse({
    nodes: tree,
    visitedNodes: new Set(),
  });

  if (result.outcome === 'success') {
    throw new Error('should fail...');
  }

  const errors = errorBox(tree, result.errors, []);
  expect(errors).toMatch(`No value provided for --some`);
});
