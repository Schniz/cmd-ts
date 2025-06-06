# `command`

This is what we call "a combinator": `command` takes multiple parsers and combine them into one parser that can also take raw user input using its `run` function.

### Config

- `name` (required): A name for the command
- `version`: A version for the command
- `handler` (required): A function that takes all the arguments and do something with it
- `args` (required): An object where the keys are the argument names (how they'll be treated in code) and the values are [parsers](../parsers.md)
- `aliases`: A list of other names this command can be called with. Useful with [`subcommands`](./subcommands.md)

### Usage

```ts
{{#include ../../example/app2.ts}}
```
