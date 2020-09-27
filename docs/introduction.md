# Introduction

`cmd-ts` is a type-driven command line argument parser written in TypeScript. Let's break it down:

### A command line argument parser written in TypeScript

Much like `commander` and similar Node.js tools, the goal of `cmd-ts` is to provide your users a superior experience while using your app from the terminal.

`cmd-ts` is built with TypeScript and tries to bring soundness and ease of use to CLI apps. It is fully typed and allows custom types as CLI arguments. More on that on the next paragraph.

`cmd-ts` API is built with small, composable "parsers" that are easily extensible

`cmd-ts` has a wonderful error output, which preserves the parsing context, allowing the users to know what they've mistyped and where, instead of playing a guessing game

### Type-driven command line argument parser

`cmd-ts` is essentially an adapter between the user's shell and the code. For some reason, most command line argument parsers only accept strings as arguments, and provide no typechecking that the value makes sense in the context of your app:

- Some arguments may be a number; so providing a string should result in an error
- Some arguments may be an integer; so providing a float should result in an error
- Some arguments may be readable files; so providing a missing path should result in an error

These types of concerns are mostly implemented in userland right now. `cmd-ts` has a different way of thinking about it using the `Type` construct, which provides both static (TypeScript) and runtime typechecking. The power of `Type` lets us have a strongly-typed commands that provide us autocomplete for our implementation and confidence in our codebase, while providing an awesome experience for the users, when they provide a wrong argument. More on that on the [Custom Types guide](./custom_types.md)
