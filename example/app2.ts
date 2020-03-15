#!/usr/bin/env YARN_SILENT=1 yarn ts-node

import {
  run,
  boolean,
  option,
  Type,
  flag,
  extendType,
  command,
  string,
} from '../src';

const PrNumber = extendType(string, {
  async from(branchName) {
    const prNumber = branchName === 'master' ? '10' : undefined;

    if (!prNumber) {
      return {
        result: 'error',
        message: `There is no PR associated with branch '${branchName}'`,
      };
    }

    return { result: 'ok', value: prNumber };
  },
  defaultValue: () => 'Hello',
});

const Repo: Type<string, string> = {
  ...string,
  defaultValue: () => {
    throw new Error("Can't infer repo from git");
  },
  description: 'repository uri',
  displayName: 'uri',
};

const app = command({
  name: 'build',
  args: {
    user: option({
      type: string,
      env: 'APP_USER',
      long: 'user',
      short: 'u',
    }),
    password: option({
      type: string,
      env: 'APP_PASS',
      long: 'password',
      short: 'p',
    }),
    repo: option({
      type: Repo,
      long: 'repo',
      short: 'r',
    }),
    prNumber: option({
      type: PrNumber,
      short: 'b',
      long: 'pr-number',
      env: 'APP_BRANCH',
    }),
    dev: flag({
      type: boolean,
      long: 'dev',
      short: 'D',
    }),
  },
  handler: ({ repo, user, password, prNumber, dev }) => {
    console.log({ repo, user, password, prNumber, dev });
  },
});

run(app, process.argv.slice(2));
