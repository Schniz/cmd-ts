---
"cmd-ts": minor
---

Add pluggable help formatters with `HelpFormatter` interface and `setDefaultHelpFormatter()` API. This allows customizing how CLI help is rendered. Also adds:
- `examples` option to commands and subcommands for documenting usage examples
- `cmd-ts/batteries/vercelFormatter` - a Vercel-style help formatter with column-aligned output
