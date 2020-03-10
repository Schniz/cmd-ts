# `clio-ts`

> 💻 A type-driven command line argument parser, with awesome error reporting 🤤

Not all command line arguments are strings, but for some reason, our CLI parsers force us to use strings everywhere. 🤔 `clio-ts` is a fully-fledged command line argument parser, influenced by Rust's [`clap`](https://github.com/clap-rs/clap) and [`structopt`](https://github.com/TeXitoi/structopt):

🤩 Awesome autocomplete, awesome safeness

🎭 Decode your own custom types from strings with logic and context-aware error handling

🌲 Nested subcommands, composable API

### Basic usage

```ts
import { command, run, string, number, positional, option } from 'clio-ts';

const cmd = command({
  name: 'my-command',
  description: 'print something to the screen',
  version: '1.0.0',
  args: {
    number: positional({ type: number, displayName: 'num' }),
    message: option({
      long: 'greeting',
      type: string,
    }),
  },
  handler: args => {
    args.message; // string
    args.number; // number
    console.log(args);
  },
});

run(cmd, process.argv.slice(2));
```

#### `command(arguments)`

Creates a CLI command. Returns either a parsing error, or an object where every argument provided gets the value with the correct type, along with a special `_` key that contains the "rest" of the positional arguments.

### Decoding custom types from strings

Not all command line arguments are strings. You sometimes want integers, UUIDs, file paths, directories, globs...

> **Note:** this section describes the `ReadStream` type, implemented in `./src/example/test-types.ts`

Let's say we're about to write a `cat` clone. We want to accept a file to read into stdout. A simple example would be something like:

```ts
// my-app.ts

import { command, run, positional, string } from 'clio-ts';

const app = command({
  /// name: ...,
  args: {
    file: positional({ type: string, displayName: 'file' }),
  },
  handler: ({ file }) => {
    // read the file to the screen
    fs.createReadStream(file).pipe(stdout);
  },
});

// parse arguments
run(app, process.argv.slice(2));
```

That works okay. But we can do better. In which ways?

- Error handling is out of the command line argument parser context, and in userland, making things less consistent and pretty.
- It shows we lack composability and encapsulation — and we miss a way to distribute shared "command line" behavior.

What if we had a way to get a `Stream` out of the parser, instead of a plain string? This is where `clio-ts` gets its power from, custom type decoding:

```ts
// ReadStream.ts

import { Type } from 'clio-ts';
import fs from 'fs';

// Type<string, Stream> reads as "A type from `string` to `Stream`"
const ReadStream: Type<string, Stream> = {
  async from(str) {
    if (!fs.existsSync(str)) {
      // Here is our error handling!
      return { result: 'error', message: 'File not found' };
    }

    return { result: 'ok', value: fs.createReadStream(str) };
  },
};
```

Now we can use (and share) this type and always get a `Stream`, instead of carrying the implementation detail around:

```ts
// my-app.ts

import { command, run, positional } from 'clio-ts';

const app = command({
  // name: ...,
  args: {
    stream: positional({ type: ReadStream, displayName: 'file' }),
  },
  handler: ({ stream }) => stream.pipe(process.stdout),
});

// parse arguments
run(app, process.argv.slice(2));
```

Encapsulating runtime behaviour and safe type conversions can help us with awesome user experience:

- We can throw an error when the file is not found
- We can try to parse the string as a URI and check if the protocol is HTTP, if so - make an HTTP request and return the body stream
- We can see if the string is `-`, and when it happens, return `process.stdin` like many Unix applications

And the best thing about it — everything is encapsulated to an easily tested type definition, which can be easily shared and reused. Take a look at [io-ts-types](https://github.com/gcanti/io-ts-types), for instance, which has types like DateFromISOString, NumberFromString and more, which is something we can totally do.

## Inspiration

This project is called `clio-ts`, because it was based on `io-ts`. This is no longer the case, because I want to reduce the dependency count and mental overhead. I might have a function to migrate types between the two.

## Development

This project was bootstrapped with [TSDX](https://github.com/jaredpalmer/tsdx).

### Local Development

Below is a list of commands you will probably find useful.

#### `npm start` or `yarn start`

Runs the project in development/watch mode. Your project will be rebuilt upon changes. TSDX has a special logger for you convenience. Error messages are pretty printed and formatted for compatibility VS Code's Problems tab.

<img src="https://user-images.githubusercontent.com/4060187/52168303-574d3a00-26f6-11e9-9f3b-71dbec9ebfcb.gif" width="600" />

Your library will be rebuilt if you make edits.

#### `npm run build` or `yarn build`

Bundles the package to the `dist` folder.
The package is optimized and bundled with Rollup into multiple formats (CommonJS, UMD, and ES Module).

<img src="https://user-images.githubusercontent.com/4060187/52168322-a98e5b00-26f6-11e9-8cf6-222d716b75ef.gif" width="600" />

#### `npm test` or `yarn test`

Runs the test watcher (Jest) in an interactive mode.
By default, runs tests related to files changed since the last commit.
