const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { writeFileSync } = require("node:fs");
const { cpus } = require("node:os");
const { resolve } = require("node:path");
const { performance } = require("node:perf_hooks");

// Use built CommonJS, not a TypeScript loader, so cold timings include the actual
// package entry point. Each version runs in its own process and gets fresh state.
function fixture(lib, name) {
	const {
		command,
		flag,
		option,
		multioption,
		positional,
		restPositionals,
		subcommands,
	} = lib;
	const mixed = [
		"--verbose",
		"--output",
		"dist/build.js",
		"-I=src",
		"index.ts",
	];
	const makeCommand = () =>
		command({
			name: "bench",
			args: {
				verbose: flag({ long: "verbose", short: "v" }),
				output: option({
					long: "output",
					short: "o",
					defaultValue: () => "out",
				}),
				include: multioption({
					type: lib.array(lib.string),
					long: "include",
					short: "I",
					defaultValue: () => [],
				}),
				files: restPositionals({}),
			},
			handler: (args) => args,
		});
	let cli = makeCommand();
	let argv = mixed;
	if (name === "empty") argv = [];
	if (name === "help") argv = ["--help"];
	if (name === "unknown") argv = ["--unknown=value"];
	if (name === "1000-unknown")
		argv = Array.from({ length: 1000 }, (_, i) => `--unknown-${i}=value`);
	if (name === "1000-positionals") {
		cli = command({
			name: "positions",
			args: Object.fromEntries(
				Array.from({ length: 1000 }, (_, i) => [`pos${i}`, positional()]),
			),
			handler: (args) => args,
		});
		argv = Array.from({ length: 1000 }, (_, i) => `value-${i}`);
	}
	if (name === "long-value") argv = ["--output", "x".repeat(16 * 1024)];
	if (name === "repeated")
		argv = Array.from({ length: 100 }, (_, i) => `--include=path-${i}`);
	if (name === "100-options" || name === "1000-options") {
		const size = name === "100-options" ? 100 : 1000;
		cli = command({
			name: "wide",
			args: Object.fromEntries(
				Array.from({ length: size }, (_, i) => [
					`opt${i}`,
					option({ long: `option-${i}` }),
				]),
			),
			handler: (args) => args,
		});
		argv = Array.from({ length: size }, (_, i) => `--option-${i}=value-${i}`);
	}
	if (name === "1000-subcommands") {
		cli = subcommands({
			name: "nested",
			cmds: Object.fromEntries(
				Array.from({ length: 1000 }, (_, i) => [`cmd${i}`, cli]),
			),
		});
		argv = ["cmd0", ...mixed];
	}
	return { cli, argv };
}

function check(result, name) {
	assert.equal(
		result._tag,
		name === "help" || name === "unknown" || name === "1000-unknown"
			? "error"
			: "ok",
	);
	if (name === "help") assert.equal(result.error.config.exitCode, 0);
	if (name === "unknown" || name === "1000-unknown")
		assert.equal(result.error.config.exitCode, 1);
	if (name === "mixed")
		assert.deepEqual(result.value, {
			verbose: true,
			output: "dist/build.js",
			include: ["src"],
			files: ["index.ts"],
		});
	if (name === "1000-options" || name === "1000-positionals")
		assert.equal(Object.keys(result.value).length, 1000);
}

function stats(values) {
	const sorted = [...values].sort((a, b) => a - b);
	return {
		medianMs: sorted[Math.floor(sorted.length / 2)],
		p10Ms: sorted[Math.floor(sorted.length * 0.1)],
		p90Ms: sorted[Math.floor(sorted.length * 0.9)],
		samplesMs: values,
	};
}

async function worker(mode, root, name) {
	const start = performance.now();
	const lib = require(resolve(root, "dist/cjs/index.js"));
	const loaded = performance.now();
	const { cli, argv } = fixture(lib, name);
	const constructed = performance.now();
	if (mode === "cold") {
		// Exercise run(), including handler + stdout, help/error output and exit.
		process.on("exit", () =>
			process.stderr.write(
				`\nTIMING ${JSON.stringify({ loadMs: loaded - start, setupMs: constructed - loaded, runMs: performance.now() - constructed })}\n`,
			),
		);
		console.log(JSON.stringify(await lib.run(cli, argv)));
		return;
	}
	check(await lib.runSafely(cli, argv), name);
	const samples = Number(process.env.BENCH_SAMPLES ?? 15);
	const sampleMs = Number(process.env.BENCH_SAMPLE_MS ?? 50);
	assert(Number.isInteger(samples) && samples >= 3);
	assert(Number.isFinite(sampleMs) && sampleMs > 0);
	let sink;
	const batch = async (count) => {
		for (let i = 0; i < count; i++) sink = await lib.runSafely(cli, argv);
	};
	let iterations = 1;
	const warmup = performance.now();
	do {
		const before = performance.now();
		await batch(iterations);
		iterations = Math.max(
			1,
			Math.min(
				1000000,
				Math.round(
					(iterations * sampleMs) / Math.max(performance.now() - before, 0.01),
				),
			),
		);
	} while (performance.now() - warmup < 150);
	const times = [];
	for (let i = 0; i < samples; i++) {
		const before = performance.now();
		await batch(iterations);
		times.push((performance.now() - before) / iterations);
	}
	check(sink, name);
	console.log(JSON.stringify(stats(times)));
}

async function main() {
	const [mode, root, name] = process.argv.slice(2);
	if (mode === "cold" || mode === "warm") return worker(mode, root, name);
	const versions = process.argv.slice(2).map((arg) => {
		const equals = arg.indexOf("=");
		assert(
			equals > 0,
			"Usage: node scripts/benchmark-e2e.cjs original=path scanner=path current=.",
		);
		return {
			label: arg.slice(0, equals),
			root: resolve(arg.slice(equals + 1)),
		};
	});
	assert(versions.length > 0);
	const names = (
		process.env.BENCH_CASES ??
		"empty,mixed,help,unknown,long-value,repeated,100-options,1000-options,1000-positionals,1000-subcommands,1000-unknown"
	).split(",");
	const coldSamples = Number(process.env.BENCH_COLD_SAMPLES ?? 31);
	assert(Number.isInteger(coldSamples) && coldSamples >= 3);
	const report = {
		node: process.version,
		cpu: cpus()[0].model,
		platform: `${process.platform}/${process.arch}`,
		coldSamples,
		warmSamples: Number(process.env.BENCH_SAMPLES ?? 15),
		warmSampleMs: Number(process.env.BENCH_SAMPLE_MS ?? 50),
		versions,
		results: [],
	};
	function child(mode, version, name) {
		const before = performance.now();
		const result = spawnSync(
			process.execPath,
			[__filename, mode, version.root, name],
			{
				encoding: "utf8",
				env: { ...process.env, DEBUG: "", NO_COLOR: "1", FORCE_COLOR: "0" },
				maxBuffer: 10 * 1024 * 1024,
				timeout: 120000,
			},
		);
		const wallMs = performance.now() - before;
		assert.ifError(result.error);
		assert.equal(
			result.status,
			mode === "cold" && (name === "unknown" || name === "1000-unknown")
				? 1
				: 0,
			result.stderr,
		);
		return { ...result, wallMs };
	}
	for (const name of names) {
		const records = versions.map((version) => ({
			label: version.label,
			name,
			warm: null,
			cold: [],
			load: [],
			setup: [],
			run: [],
		}));
		for (let i = 0; i < versions.length; i++)
			records[i].warm = JSON.parse(child("warm", versions[i], name).stdout);
		// Rotate version order each sample to reduce order/thermal bias. First
		// launch is excluded; "cold" means fresh Node, not cold filesystem caches.
		const expectedOutput = new Map();
		for (let sample = -1; sample < coldSamples; sample++) {
			for (let offset = 0; offset < versions.length; offset++) {
				const i = (Math.max(sample, 0) + offset) % versions.length;
				const result = child("cold", versions[i], name);
				const match = result.stderr.match(/\nTIMING (.+)\n/);
				assert(match, result.stderr);
				const output = {
					stdout: result.stdout,
					stderr: result.stderr.replace(match[0], ""),
				};
				if (!expectedOutput.has(name)) expectedOutput.set(name, output);
				assert.deepEqual(
					output,
					expectedOutput.get(name),
					`${versions[i].label}/${name} output differs`,
				);
				if (sample < 0) continue;
				const timing = JSON.parse(match[1]);
				records[i].cold.push(result.wallMs);
				records[i].load.push(timing.loadMs);
				records[i].setup.push(timing.setupMs);
				records[i].run.push(timing.runMs);
			}
		}
		for (const record of records) {
			const result = {
				label: record.label,
				name,
				warm: record.warm,
				cold: stats(record.cold),
				load: stats(record.load),
				setup: stats(record.setup),
				run: stats(record.run),
			};
			report.results.push(result);
			console.log(
				`${record.label}/${name}\twarm ${(result.warm.medianMs * 1000).toFixed(2)} µs\tcold ${result.cold.medianMs.toFixed(2)} ms (${result.cold.p10Ms.toFixed(2)}–${result.cold.p90Ms.toFixed(2)})`,
			);
		}
	}
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
