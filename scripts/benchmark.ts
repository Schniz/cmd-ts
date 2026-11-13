import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { performance } from "node:perf_hooks";
import type { RegisterOptions } from "../src/argparser";
import { command } from "../src/command";
import { flag } from "../src/flag";
import { multioption } from "../src/multioption";
import { parseArguments } from "../src/newparser/parseArguments";
import { parse as parseTokens } from "../src/newparser/parser";
import { tokenize } from "../src/newparser/tokenizer";
import { option } from "../src/option";
import { restPositionals } from "../src/restPositionals";
import { parse } from "../src/runner";
import { subcommands } from "../src/subcommands";
import { array, string } from "../src/types";

// Keep fixture construction, correctness checks and disk I/O outside timed loops.
const registered: RegisterOptions = {
	forceFlagLongNames: new Set(["verbose", "quiet"]),
	forceFlagShortNames: new Set(["v", "q"]),
	forceOptionLongNames: new Set(["output", "include"]),
	forceOptionShortNames: new Set(["o", "I"]),
};
const cli = command({
	name: "bench",
	args: {
		verbose: flag({ long: "verbose", short: "v" }),
		quiet: flag({ long: "quiet", short: "q" }),
		output: option({ long: "output", short: "o", defaultValue: () => "out" }),
		include: multioption({
			type: array(string),
			long: "include",
			short: "I",
			defaultValue: () => [],
		}),
		files: restPositionals({}),
	},
	handler: (args) => args,
});
const wideArgs = Object.fromEntries(
	Array.from({ length: 100 }, (_, i) => [
		`opt${i}`,
		option({ long: `option-${i}`, defaultValue: () => "default" }),
	]),
);
const wide = command({ name: "wide", args: wideArgs, handler: (args) => args });
const nested = subcommands({ name: "nested", cmds: { build: cli } });
const mixed = ["--verbose", "--output", "dist/build.js", "-I=src", "index.ts"];
const longValue = ["--output", "x".repeat(16 * 1024)];
const positionals = Array.from(
	{ length: 100 },
	(_, i) => `src/path-${i}/file.ts`,
);
const repeated = Array.from({ length: 100 }, (_, i) => `--include=path-${i}`);
const wideArgv = Array.from(
	{ length: 100 },
	(_, i) => `--option-${i}=value-${i}`,
);
const nestedArgv = ["build", ...mixed];
const astFixtures: [string, string[]][] = [
	["mixed", mixed],
	["long-value", longValue],
	["positionals", positionals],
	["repeated", repeated],
	["short-bundle", ["-vqI=src", "index.ts"]],
];

type Case = { name: string; run: () => unknown; async?: boolean };
const cases: Case[] = [
	...astFixtures.map(([name, argv]) => ({
		name: `ast/${name}`,
		run: () => parseArguments(argv, registered),
	})),
	{ name: "parse/empty", run: () => parse(cli, []), async: true },
	{ name: "parse/mixed", run: () => parse(cli, mixed), async: true },
	{ name: "parse/long-value", run: () => parse(cli, longValue), async: true },
	{
		name: "parse/positionals",
		run: () => parse(cli, positionals),
		async: true,
	},
	{ name: "parse/repeated", run: () => parse(cli, repeated), async: true },
	{ name: "parse/100-options", run: () => parse(wide, wideArgv), async: true },
	{
		name: "parse/subcommand",
		run: () => parse(nested, nestedArgv),
		async: true,
	},
	{
		name: "parse/unknown",
		run: () => parse(cli, ["--unknown=value"]),
		async: true,
	},
];

type Measurement = {
	name: string;
	medianNs: number;
	p10Ns: number;
	p90Ns: number;
};
type Report = {
	node: string;
	cpu: string;
	platform: string;
	samples: number;
	sampleMs: number;
	results: Measurement[];
};

async function main() {
	for (const [, argv] of astFixtures) {
		assert.deepEqual(
			parseArguments(argv, registered),
			parseTokens(tokenize(argv), registered),
		);
	}
	assert.deepEqual(await parse(cli, mixed), {
		_tag: "ok",
		value: {
			verbose: true,
			quiet: false,
			output: "dist/build.js",
			include: ["src"],
			files: ["index.ts"],
		},
	});
	const samples = Number(process.env.BENCH_SAMPLES ?? 15);
	const sampleMs = Number(process.env.BENCH_SAMPLE_MS ?? 50);
	assert(Number.isInteger(samples) && samples >= 3);
	assert(Number.isFinite(sampleMs) && sampleMs > 0);
	const baseline: Report | undefined = process.env.BENCH_BASELINE
		? JSON.parse(readFileSync(process.env.BENCH_BASELINE, "utf8"))
		: undefined;
	const report: Report = {
		node: process.version,
		cpu: cpus()[0].model,
		platform: `${process.platform}/${process.arch}`,
		samples,
		sampleMs,
		results: [],
	};
	console.log(
		`${report.node} · ${report.cpu} · ${report.platform} · ${samples} × ${sampleMs}ms`,
	);
	console.log("case\tmedian ns/op\tp10–p90 ns/op\tbaseline/current");
	let sink: unknown;
	for (const bench of cases) {
		const checked = await bench.run();
		if (bench.async) {
			assert.equal(
				(checked as { _tag: string })._tag,
				bench.name === "parse/unknown" ? "error" : "ok",
				bench.name,
			);
		} else {
			assert(Array.isArray(checked) && checked.length > 0, bench.name);
		}
		let iterations = 1;
		const batch = bench.async
			? async (count: number) => {
					for (let i = 0; i < count; i++) sink = await bench.run();
				}
			: (count: number) => {
					for (let i = 0; i < count; i++) sink = bench.run();
				};
		// Calibrate and warm up for at least 150ms before collecting samples.
		const warmup = performance.now();
		do {
			const start = performance.now();
			await batch(iterations);
			const elapsed = performance.now() - start;
			iterations = Math.max(
				1,
				Math.min(
					1_000_000,
					Math.round((iterations * sampleMs) / Math.max(elapsed, 0.01)),
				),
			);
		} while (performance.now() - warmup < 150);
		const times: number[] = [];
		for (let sample = 0; sample < samples; sample++) {
			const start = performance.now();
			await batch(iterations);
			times.push(((performance.now() - start) * 1e6) / iterations);
		}
		times.sort((a, b) => a - b);
		const result = {
			name: bench.name,
			medianNs: times[Math.floor(samples / 2)],
			p10Ns: times[Math.floor(samples * 0.1)],
			p90Ns: times[Math.floor(samples * 0.9)],
		};
		report.results.push(result);
		const previous = baseline?.results.find((x) => x.name === bench.name);
		console.log(
			`${result.name}\t${result.medianNs.toFixed(0)}\t${result.p10Ns.toFixed(0)}–${result.p90Ns.toFixed(0)}\t${previous ? `${(previous.medianNs / result.medianNs).toFixed(2)}x` : "—"}`,
		);
	}
	assert.notEqual(sink, undefined);
	if (process.env.BENCH_OUTPUT)
		writeFileSync(
			process.env.BENCH_OUTPUT,
			`${JSON.stringify(report, null, 2)}\n`,
		);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
