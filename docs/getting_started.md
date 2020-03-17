# Getting Started

Install the package using npm:

```
npm install --save cmd-ts
```

or if you use Yarn:

```
yarn add cmd-ts
```

## Using `cmd-ts`

All the interesting stuff is exported from the main module. Try writing the following app:

```ts
import { command, run, string, positional } from 'cmd-ts';

const app = command({
  name: 'my-first-app',
  args: {
    someArg: positional({ type: string, displayName: 'some arg' })
  },
  handler: ({ someArg }) => {
    console.log({ someArg });
  },
});

run(app, process.argv.slice(2));
```

This app is taking one string positional argument and prints it to the screen. Read more about the different parsers and combinators in [Parsers and Combinators](./parsers.md).

> **Note:** `string` is one type that comes included in `cmd-ts`. There are more of these bundled in the [included types guide](./included_types.md). You can define your own types using the [custom types guide](./custom_types.md)
