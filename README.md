# `clio-ts`

> 💻 A type-driven command line argument parser, based on [`io-ts`](https://github.com/gcanti/io-ts).

A fully-fledged command line argument parser, influenced by Rust's `clap`, using `io-ts` for safe type conversions:

🤩 Awesome autocomplete, awesome safeness

🎭 Decode your own custom types from strings

🌲 Nested subcommands, composable API

### Decoding custom types from strings

Not all command line arguments should be strings. You sometimes want integers, UUIDs, file paths, directories, globs...

> **Note:** this section describes the `ReadStream` type, implemented in `./src/example/test-types.ts`

Let's say we're about to write a `cat` clone. We want to accept a file to read into stdout. A simple example would be something like:

```ts
// my-app.ts

const app = command({
  file: positional({ type: t.string, displayName: 'file' }),
});
// const parsed = app.parse(...);
// ensureCliSuccess(parsed);
const [{ file }] = parsed;
fs.createReadStream(file).pipe(stdout);
```

That works okay. But we can do better. What if we had a way to get a `Stream` in return? This is where `clio-ts` gets its power from. Custom types.

```ts
// ReadStream.ts

const ReadStream = new t.Type<Stream, string>(
  'ReadStream',
  _ => unimplemented(),
  (obj, ctx) => {
    // Check that the value provided is a string
    if (typeof obj !== 'string') {
      return t.failure(obj, ctx, 'This is not a string');
    }

    // Create the stream and return it
    const stream = fs.createReadStream(file);
    return t.success(stream);
  },
  _ => unimplemented()
);
```

Now we can use (and share) this type and always get a Stream, instead of carrying the implementation detail around:

```ts
// my-app.ts

const app = command({
  stream: positional({ type: ReadStream, displayName: 'file' }),
});
// const parsed = app.parse(...);
// ensureCliSuccess(parsed);
const [{ stream }] = parsed;
stream.pipe(stdout);
```

This also provide us the ability to add better error messages and more features/conversions to our programs with ease:

- We can throw an error when the file is not found
- We can try to parse the string as a URI and check if the protocol is HTTP, if so - make an HTTP request and return the body stream
- We can see if the string is `-`, and when it happens, return `process.stdin` like many Unix applications

And the best thing about it — everything is encapsulated to an easily tested io-ts type definition, which can be easily shared and reused. Take a look at [io-ts-types](https://github.com/gcanti/io-ts-types), for instance, which has types like DateFromISOString, NumberFromString and more!

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
