#!/usr/bin/env YARN_SILENT=1 yarn ts-node --

import { tokenize } from './newparser/tokenizer';
import { parse } from './newparser/parser';
import { flattenTree } from './newparser/flattenTree';
const tokens = tokenize(process.argv.slice(2));
const tree = parse(tokens, {
  longOptionKeys: new Set(),
  shortOptionKeys: new Set(),
});
const flattened = flattenTree(tree);
console.log(flattened);
