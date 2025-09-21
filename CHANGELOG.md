# cmd-ts

## 0.14.2

### Patch Changes

- 87565b2: Added onMissing callback support to flags, options, and custom types

  That allows providing dynamic fallback values when command-line arguments are not provided, This enables:

  - Hiding default values from help output
  - Interactive prompts: Ask users for input when flags/options are missing
  - Environment-based defaults: Check environment variables or config files dynamically
  - Auto-discovery: Automatically find files or resources when not specified
  - Async support: Handle both synchronous and asynchronous fallback logic

  The onMissing callback is used as a fallback when defaultValue is not provided, following the precedence order: environment variables → defaultValue → onMissing → type defaults.

  New APIs:

  - flag({ onMissing: () => boolean | Promise<boolean> })
  - option({ onMissing: () => T | Promise<T> })
  - multioption({ onMissing: () => T[] | Promise<T[]> })
  - Custom Type interface now supports onMissing property

## 0.14.1

### Patch Changes

- 46bf4a7: fix: properly reconstruct original argument strings in rest combinator

## 0.14.0

### Minor Changes

- a1afb05: --help exits with statuscode 0

## 0.13.0

### Minor Changes

- dfeafc8: add `defaultValue` configuration @ `multioption`

## 0.12.1

### Patch Changes

- 5867a13: Allow dangling forcePositionals

## 0.12.0

### Minor Changes

- 2f651de: Display help when calling subcommands without any arguments

### Patch Changes

- e05e433: Allow readonly T[] in oneOf

## 0.11.0

### Minor Changes

- 6cb8d08: upgrade all deps
