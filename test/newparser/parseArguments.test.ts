import assert from "node:assert/strict";
import createDebugger from "debug";
import { describe, expect, test, vi } from "vitest";
import type { RegisterOptions } from "../../src/argparser";
import { parseArguments } from "../../src/newparser/parseArguments";
import { parse } from "../../src/newparser/parser";
import { tokenize } from "../../src/newparser/tokenizer";
import { createRegisterOptions } from "../createRegisterOptions";

function registrations(): RegisterOptions[] {
	const empty = createRegisterOptions();
	const flags = createRegisterOptions();
	flags.forceFlagLongNames = new Set(["verbose", "output", "", "😀"]);
	flags.forceFlagShortNames = new Set(["v", "o", "😀"]);
	const options = createRegisterOptions();
	options.forceOptionLongNames = new Set(["output", "verbose", "", "😀"]);
	options.forceOptionShortNames = new Set(["o", "v", "😀"]);
	return [
		empty,
		flags,
		options,
		{
			...flags,
			forceOptionLongNames: options.forceOptionLongNames,
			forceOptionShortNames: options.forceOptionShortNames,
		},
	];
}

function outcome(run: () => unknown) {
	try {
		return { value: run() };
	} catch (error) {
		if (!(error instanceof Error)) throw error;
		return { error: error.message };
	}
}

function compare(argv: string[], registered: RegisterOptions) {
	assert.deepStrictEqual(
		outcome(() => parseArguments(argv, registered)),
		outcome(() => parse(tokenize(argv), registered)),
		JSON.stringify(argv),
	);
}

describe("argv parser matches the token parser", () => {
	const arguments_ = [
		"",
		"plain",
		"a-b--c",
		"=",
		"-",
		"--",
		"---",
		"----",
		"-v",
		"-vo",
		"--verbose",
		"--output",
		"--output=x=y",
		"--output=",
		"--=x",
		"--=",
		"-=x",
		"-o=value",
		"-o=",
		"-1.5",
		"-a--b",
		"-😀v",
		"-v😀",
		"--😀",
		"😀🦄",
		"a b\tc\nd",
		"\ud800",
		"\udfff",
	];
	for (const [index, registered] of registrations().entries()) {
		test(`all pairs, registration ${index}`, () => {
			compare([], registered);
			for (const a of arguments_) {
				compare([a], registered);
				for (const b of arguments_) compare([a, b], registered);
			}
		});
	}

	test("20,000 deterministic argument lists, including token-boundary edge cases", () => {
		let seed = 0x12345678;
		const random = (limit: number) => {
			seed ^= seed << 13;
			seed ^= seed >>> 17;
			seed ^= seed << 5;
			return (seed >>> 0) % limit;
		};
		const configs = registrations();
		const chars = ["a", "v", "o", "-", "=", "😀", " ", "\ud800"];
		for (let i = 0; i < 20_000; i++) {
			const argv = Array.from({ length: random(8) }, () => {
				if (random(2)) return arguments_[random(arguments_.length)];
				return Array.from(
					{ length: random(12) },
					() => chars[random(chars.length)],
				).join("");
			});
			compare(argv, configs[random(configs.length)]);
		}
	});
});

test("keeps UTF-16 diagnostic positions and code-point short keys", () => {
	const registered = createRegisterOptions();
	registered.forceFlagShortNames.add("😀");
	expect(
		parseArguments(["😀", "-v😀", "--output=🦄"], registered),
	).toStrictEqual([
		{ type: "positionalArgument", index: 0, raw: "😀" },
		{
			type: "shortOptions",
			index: 3,
			raw: "-v😀",
			options: [
				{ type: "shortOption", index: 4, key: "v", raw: "v" },
				{
					type: "shortOption",
					index: 5,
					key: "😀",
					raw: "😀",
					value: undefined,
				},
			],
		},
		{
			type: "longOption",
			index: 8,
			key: "output",
			raw: "--output=🦄",
			value: {
				type: "optionValue",
				index: 16,
				raw: "=🦄",
				delimiter: { type: "delimiter", index: 16, raw: "=" },
				node: { type: "value", index: 17, raw: "🦄" },
			},
		},
	]);
});

test("does not mutate argv or registration, and creates fresh nodes", () => {
	const argv = ["--output", "-1", "--", "--verbose"];
	const original = [...argv];
	const registered = registrations()[2];
	const before = structuredClone(registered);
	const first = parseArguments(argv, registered);
	const second = parseArguments(argv, registered);
	expect(argv).toStrictEqual(original);
	expect(registered).toStrictEqual(before);
	expect(first).toStrictEqual(second);
	expect(first[0]).not.toBe(second[0]);
});

test.each<[string, string[]]>([
	[
		"registered options consume dash-prefixed values",
		["--output", "--", "-o", "-1"],
	],
	[
		"only the last bundled short option takes a value",
		["-vvo", "value", "tail"],
	],
	[
		"the positional divider preserves subsequent dashes and equals",
		["--", "-vq", "--output=x=y", "-"],
	],
	[
		"empty arguments retain token-boundary behavior",
		["--output", "", "value", ""],
	],
	[
		"empty inline values retain token-boundary behavior",
		["--output=", "value", "-o="],
	],
	[
		"compatibility fallback keeps earlier diagnostic offsets",
		["😀", "--output=value", "-a--b", "tail"],
	],
])("%s", (_name, argv) => {
	for (const registered of registrations()) compare(argv, registered);
});

test("debug mode retains registered-option and syntax-tree logging", () => {
	const previous = createDebugger.disable();
	const log = vi.spyOn(createDebugger, "log").mockImplementation(() => {});
	try {
		createDebugger.enable("cmd-ts:parser");
		parseArguments(["--output=value"], registrations()[2]);
		expect(log).toHaveBeenCalledTimes(2);
		expect(log.mock.calls[0][0]).toContain("Registered:");
		expect(log.mock.calls[1][0]).toContain("Parsed items:");
	} finally {
		createDebugger.enable(previous);
		log.mockRestore();
	}
});
