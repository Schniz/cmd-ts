import chalk from 'chalk';
import Head from 'next/head';
import { Text } from '../components/Text';
import { GetStaticProps } from 'next';
import { Terminal } from '../components/Terminal';

const Home = (props: { multilineErrorSnap: string; allSnaps: Snapshot[] }) => {
  return (
    <div className="container">
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <Text variant="heading" style="code">
          cmd-ts
        </Text>
        <Text>A command line argument parser for the modern times.</Text>

        <Text>Supports multiline errors</Text>
        <Terminal>{props.multilineErrorSnap}</Terminal>
      </main>
    </div>
  );
};

type Snapshot = { name: string; snap: string };

function findOrDie<T>(t: T[], fn: (t: T) => boolean): T {
  const result = t.find(fn);
  if (!result) {
    throw new Error("Can't find needle");
  }
  return result;
}

export const getStaticProps: GetStaticProps = async () => {
  function prompt(text: string) {
    return chalk.blue(`✡ `) + `${text}\n`;
  }

  function getAllSnapshots(): Snapshot[] {
    const storedSnapshots: Record<
      string,
      string
    > = require('../../test/__snapshots__/ui.test.ts.snap');
    const snapshots: Snapshot[] = [];

    for (const [snapName, snapshot] of Object.entries(storedSnapshots)) {
      const name = snapName.match(/^(.+) \d+$/)?.[1];
      if (name) {
        snapshots.push({ name, snap: snapshot.trim().slice(1, -1) });
      }
    }

    return snapshots;
  }

  const allSnaps = getAllSnapshots();

  const multilineErrorSnap =
    prompt('subcmds greet "Bon Jovi"') +
    findOrDie(allSnaps, x => x.name === 'multiline error').snap;

  return {
    props: {
      allSnaps,
      multilineErrorSnap,
    },
  };
};

export default Home;
