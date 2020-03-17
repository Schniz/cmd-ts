# Parsers and Combinators

`cmd-ts` can help you build a full command line application, with nested commands, options, arguments, and whatever you want. One of the secret sauces baked into `cmd-ts` is the ability to compose parsers.

## Argument Parser

An argument parser is a simple struct with a `parse` function and an optional `register` function.

`cmd-ts` is shipped with a couple of parsers and combinators to help you build your dream command-line app:

- [`positional` and `restPositionals`](./parsers/positionals.md) to read arguments by position
- [`option` and `multioption`](./parsers/options.md) to read binary `--key value` arguments
- [`flag` and `multiflag`](./parsers/flags.md) to read unary `--key` arguments
- [`command`](./parsers/command.md) to compose multiple arguments into a command line app
- [`subcommands`](./parsers/subcommands.md) to compose multiple command line apps into one command line app
- [`binary`](./parsers/binary.md) to make a command line app a UNIX-executable-ready command
