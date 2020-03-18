# Custom Types

Not all command line arguments are strings. You sometimes want integers, UUIDs, file paths, directories, globs...

> **Note:** this section describes the `ReadStream` type, implemented in `./example/test-types.ts`

Let's say we're about to write a `cat` clone. We want to accept a file to read into stdout. A simple example would be something like:

```ts
// my-app.ts

import { command, run, positional, string } from 'cmd-ts';

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

That works well! We already get autocomplete from TypeScript and we're making progress towards developer experience. Still, we can do better. In which ways, you might think?

- Error handling is non existent, and if we'd implement it in our handler it'll be out of the command line argument parser context, making things less consistent and pretty.
- It shows we lack composability and encapsulation — we miss a way to share and distribute "command line" behavior.

> 💡 What if we had a way to get a `Stream` out of the parser, instead of a plain string?

This is where `cmd-ts` gets its power from,

### Custom Type Decoding

Exported from `cmd-ts`, the construct `Type<A, B>` is a way to declare a type that can be converted from `A` into `B`, in a safe manner. `cmd-ts` uses it to decode the arguments provided. You might've seen the `string` type, which is `Type<string, string>`, or, the identity: because every string is a string. Constructing our own types let us have all the implementation we need in an isolated and easily composable.

So in our app, we need to implement a `Type<string, Stream>`, or — a type that reads a `string` and outputs a `Stream`:

```ts
// ReadStream.ts

import { Type } from 'cmd-ts';
import fs from 'fs';

// Type<string, Stream> reads as "A type from `string` to `Stream`"
const ReadStream: Type<string, Stream> = {
  async from(str) {
    if (!fs.existsSync(str)) {
      // Here is our error handling!
      throw new Error('File not found');
    }

    return fs.createReadStream(str);
  },
};
```

- `from` is the only required key in `Type<A, B>`. It's an async operation that gets `A` and returns a `B`, or throws an error with some message.
- Other than `from`, we can provide more metadata about the type:
  - `description` to provide a default description for this type
  - `displayName` is a short way to describe the type in the help
  - `defaultValue(): B` to allow the type to be optional and have a default value

Using the type we've just created is no different that using `string`:

```ts
// my-app.ts

import { command, run, positional } from 'cmd-ts';

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

Our `handler` function now takes a `stream` which has a type of `Stream`. This is amazing: we've pushed the logic of encoding a `string` into a `Stream` outside of our implementation, which free us from having lots of guards and checks inside our `handler` function, making it less readable and harder to test.

Now, we can add more features to our `ReadStream` type and stop touching our code which expects a `Stream`:

- We can throw a detailed error when the file is not found
- We can try to parse the string as a URI and check if the protocol is HTTP, if so - make an HTTP request and return the body stream
- We can see if the string is `-`, and when it happens, return `process.stdin` like many Unix applications

And the best thing about it — everything is encapsulated to an easily tested type definition, which can be easily shared and reused. Take a look at [io-ts-types](https://github.com/gcanti/io-ts-types), for instance, which has types like DateFromISOString, NumberFromString and more, which is something we can totally do.
