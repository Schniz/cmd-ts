#!/usr/bin/env YARN_SILENT=1 yarn ts-node

import { binaryParser, command, single, t, bool, parse } from '..';
import { fromStr } from '../command';

const getRepoUrl = () => 'my-repo-uri';

const PrNumber = fromStr((branchName, ctx) => {
  const prNumber = branchName === 'master' ? '10' : undefined;

  if (!prNumber) {
    return t.failure(
      branchName,
      ctx,
      `There is no PR associated with branch '${branchName}'`
    );
  }

  return t.success(prNumber);
});

const app = command({
  user: { type: single(t.string), env: 'APP_USER', kind: 'named', short: 'u' },
  password: {
    type: single(t.string),
    env: 'APP_PASS',
    kind: 'named',
    short: 'p',
  },
  repo: {
    type: single(t.string),
    kind: 'named',
    short: 'r',
    defaultValue: getRepoUrl(),
  },
  prNumber: {
    type: single(PrNumber),
    kind: 'named',
    short: 'b',
    long: 'pr-number',
    defaultValue: 'hello',
    env: 'APP_BRANCH',
  },
  dev: {
    type: single(bool),
    kind: 'boolean',
    defaultValue: false,
  },
});
const { repo, user, password, prNumber, dev } = parse(
  binaryParser(app, 'app'),
  process.argv
);
console.log({ repo, user, password, prNumber, dev });
