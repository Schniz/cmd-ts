#!/usr/bin/env YARN_SILENT=1 yarn ts-node

import {
  run,
  binary,
  boolean,
  option,
  Type,
  flag,
  extendType,
  command,
  string,
} from '..';

const getRepoUrl = () => 'my-repo-uri';

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
  defaultValue: getRepoUrl,
  description: 'repository uri',
  displayName: 'uri',
};

const app = command({
  name: 'build',
  args: {
    user: option({
      decoder: string,
      env: 'APP_USER',
      long: 'user',
      short: 'u',
    }),
    password: option({
      decoder: string,
      env: 'APP_PASS',
      long: 'password',
      short: 'p',
    }),
    repo: option({
      decoder: Repo,
      long: 'repo',
      short: 'r',
    }),
    prNumber: option({
      decoder: PrNumber,
      short: 'b',
      long: 'pr-number',
      env: 'APP_BRANCH',
    }),
    dev: flag({
      decoder: boolean,
      long: 'dev',
      short: 'D',
    }),
  },
  handler: ({ repo, user, password, prNumber, dev }) => {
    console.log({ repo, user, password, prNumber, dev });
  },
});

run(binary(app), process.argv);
