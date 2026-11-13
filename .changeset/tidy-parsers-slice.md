---
"cmd-ts": patch
---

Parse argv directly without allocating a token for every character, and speed up single-name option lookups. Preserve existing syntax trees and diagnostic positions, with a compatibility path for unusual token boundaries. Add reproducible parser benchmarks.
