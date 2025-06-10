import * as c from "../src";
import { ArgParser2, ArgvItem } from "../src/argparser2";
import { describe, expect, test, expectTypeOf } from "vitest";

describe("defaults", () => {
	test("no argv defaults to false", async () => {
		const parsed = await c.flag({ long: "verbose" }).parse2([]);
		expect(parsed).toEqual({
			errors: [],
			remainingArgv: [],
			result: { value: false },
		});
	});

	test("unrelated input defaults to false", async () => {
		const parsed = await c
			.flag({ long: "verbose" })
			.parse2(ArgvItem.normalize(["hello"]));
		expect(parsed).toEqual({
			errors: [],
			remainingArgv: [{ index: 0, value: "hello" }],
			result: { value: false },
		});
	});
});

describe("long", () => {
	test("parses a default type to true", async () => {
		const parsed = await c
			.flag({ long: "verbose" })
			.parse2(ArgvItem.normalize(["--verbose"]));
		expect(parsed).toEqual({
			errors: [],
			remainingArgv: [],
			result: { value: true },
		});
	});

	test("parses an explicit value", async () => {
		const parsed = await c
			.flag({ long: "verbose" })
			.parse2(ArgvItem.normalize(["--verbose=true"]));
		expect(parsed).toEqual({
			errors: [],
			remainingArgv: [],
			result: { value: true },
		});
	});

	test("fails to parse an explicit value", async () => {
		const parsed = await c
			.flag({ long: "verbose" })
			.parse2(ArgvItem.normalize(["--verbose=yo"]));
		expect(parsed).toEqual({
			errors: [
				{
					atomic: true,
					cause: new Error(
						`expected value to be either "true" or "false". got: "yo"`,
					),
					argv: { index: 0, span: [10, 12], value: "yo" },
				},
			],
			remainingArgv: [],
			result: null,
		});
	});
});

describe("short", () => {
	test("parses a default type to true", async () => {
		const parsed = await c
			.flag({ short: "v", long: "verbose" })
			.parse2(ArgvItem.normalize(["-v"]));
		expect(parsed).toEqual({
			errors: [],
			remainingArgv: [],
			result: { value: true },
		});
	});

	test("parses an explicit value", async () => {
		const parsed = await c
			.flag({ short: "v", long: "verbose" })
			.parse2(ArgvItem.normalize(["-v=true"]));
		expect(parsed).toEqual({
			errors: [],
			remainingArgv: [],
			result: { value: true },
		});
	});

	test("fails to parse an explicit value", async () => {
		const parsed = await c
			.flag({ short: "v", long: "verbose" })
			.parse2(ArgvItem.normalize(["-v=yo"]));
		expect(parsed).toEqual({
			errors: [
				{
					atomic: true,
					cause: new Error(
						`expected value to be either "true" or "false". got: "yo"`,
					),
					argv: { index: 0, span: [3, 5], value: "yo" },
				},
			],
			remainingArgv: [],
			result: null,
		});
	});
});
