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

## End-to-end command execution

Build each revision first with `pnpm build`, then compare its directory:

```sh
BENCH_OUTPUT=.tmp.dontcommit/e2e.json pnpm bench:e2e before=/path/to/before after=.
```

This uses the built CommonJS public entry point on the current Node executable,
without a TypeScript loader. It checks identical stdout, stderr and exit codes
across revisions. Dependencies must be installed in each directory (a shared
`node_modules` symlink is sufficient).

- **Warm:** `runSafely()` includes registration, parsing, help handling,
  async decoding, validation and an identity handler. Errors/help are formatted,
  but nothing is printed. Command construction is outside the timed loop.
- **Cold:** a fresh Node process loads the public entry point, constructs a
  command, calls `run()`, prints the handler result or help/error, and exits.
  Parent wall time includes process creation, pipe I/O and exit. Child timings
  separately measure module load, fixture construction and execution/output.
  Instrumentation and this small JS harness are included; this is not a shell or
  terminal-rendering benchmark. Filesystem caches are warm, not flushed.
- Fixtures include empty/mixed argv, help, unknown arguments, a 16 KiB value,
  100 repeated options, 100/1,000 declared options, 1,000 individual positional
  decoders, 1,000 registered subcommands and 1,000 unknown options. Scaling cases
  are stress tests, not representative CLI workloads. The subcommand fixture
  selects the first entry; it intentionally shares the leaf command.
- Cold samples rotate revision order, discard one initial launch per fixture and
  report 31 individual process times. Warm samples use the same calibrated
  15 × 50 ms batches as the parser benchmark. JSON retains every sample.

`BENCH_CASES=mixed,help` selects cases; `BENCH_COLD_SAMPLES`, `BENCH_SAMPLES` and
`BENCH_SAMPLE_MS` control sampling. Repeat the complete comparison in separate
processes, rotate revision order, and compare medians. Do not run other benchmarks
or tests concurrently. A warm microsecond gain need not change a cold CLI that
spends tens of milliseconds starting Node and loading modules.
