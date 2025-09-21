---
'cmd-ts': patch
---

Added onMissing callback support to flags, options, and custom types

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
