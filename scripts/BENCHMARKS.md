# Parser benchmarks

Run `pnpm bench` with the Node version in `.node-version`. No extra dependencies
are needed. The benchmark checks its fixtures before timing them.

- `ast/*` measures argv → syntax tree, without command setup or value decoding.
- `parse/*` measures the public `parse()` API, including fresh registration,
  syntax-tree construction, async value decoding and argument validation.
- Fixtures cover short bundles, mixed arguments, a 16 KiB value, 100 positionals,
  100 repeated options, a 100-option command, subcommands and unknown arguments.
- Commands and input strings are created once. Each operation gets fresh parse
  state; no command handler runs. This measures warm parsing, not CLI startup.

Each case warms up for at least 150 ms, then reports the median and the 10th–90th
percentiles of 15 batches of roughly 50 ms. Batch size is calibrated per case.
These are batch averages, not individual-request latency percentiles. Results
are consumed to prevent unused results from being removed by the optimizer.

```sh
mkdir -p .tmp.dontcommit
BENCH_OUTPUT=.tmp.dontcommit/before.json pnpm bench
# Make the parser change, then run on the same Node version and idle machine:
BENCH_BASELINE=.tmp.dontcommit/before.json \
  BENCH_OUTPUT=.tmp.dontcommit/after.json pnpm bench
```

`baseline/current` is the speedup (higher is better). Repeat each version in
separate processes and compare medians, rather than trusting one run. Runtime,
CPU and platform are included in the JSON output. `BENCH_SAMPLES` and
`BENCH_SAMPLE_MS` can change the sampling duration. Do not compare results from
different machines, Node versions or sampling settings. Do not run tests or other
benchmarks at the same time. The 16 KiB case specifically measures avoided
per-character allocation; its speedup is not representative of a typical CLI.
