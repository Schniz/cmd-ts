#!/usr/bin/env node

const chalk = require('chalk');
const allSnapshots = require('../test/__snapshots__/ui.test.ts.snap');

for (const [snapName, snapshot] of Object.entries(allSnapshots)) {
  const snapNameWithoutNumber = snapName.match(/^(.+) \d+$/)[1];
  console.log(chalk.bold.underline(snapNameWithoutNumber));
  console.log(
    snapshot
      .trim()
      .slice(1, -1)
      .split('\n')
      .map(x => `  ${x}`)
      .join('\n')
  );
  console.log();
  console.log();
}
