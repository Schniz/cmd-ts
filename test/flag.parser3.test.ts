import * as AP3 from "../src/argparser3";
import * as c from "../src";
import { describe, test, expect } from "vitest";

describe("defaults", () => {
	test("no argv defaults to false", async () => {
		const parsed = await AP3.parse(c.flag({ long: "verbose" }).parser3, []);
		expect(parsed).toEqual({
			errors: [],
			remainingArgv: [],
			result: { value: false },
		});
	});

	test("unrelated input defaults to false", async () => {
		const parsed = await AP3.parse(
			c.flag({ long: "verbose" }).parser3,
			AP3.ArgvItem.normalize(["hello"]),
		);
		expect(parsed).toEqual({
			errors: [],
			remainingArgv: [{ index: 0, value: "hello" }],
			result: { value: false },
		});
	});
	test("fails to parse default value", async () => {
		const parsed = await AP3.parse(
			c.flag({
				long: "verbose",
				type: c.extendType(c.boolean, async (v) => {
					throw new Error(`Never accepting ${v}`);
				}),
			}).parser3,
			[],
		);
		expect(parsed).toEqual({
			errors: [
				AP3.ParsingError.forUnknownArgv(new Error("Never accepting false")),
			],
			remainingArgv: [],
			result: null,
		});
	});
});
describe("long", () => {
	test("parses a default type to true", async () => {
		const parsed = await AP3.parse(
			c.flag({ long: "verbose" }).parser3,
			AP3.ArgvItem.normalize(["--verbose"]),
		);
		expect(parsed).toEqual({
			errors: [],
			remainingArgv: [],
			result: { value: true },
		});
	});

	test("parses an explicit value", async () => {
		const parsed = await AP3.parse(
			c.flag({ long: "verbose" }).parser3,
			AP3.ArgvItem.normalize(["--verbose=true"]),
		);
		expect(parsed).toEqual({
			errors: [],
			remainingArgv: [],
			result: { value: true },
		});
	});

	test("fails to parse an explicit value", async () => {
		const parsed = await AP3.parse(
			c.flag({ long: "verbose" }).parser3,
			AP3.ArgvItem.normalize(["--verbose=yo"]),
		);
		expect(parsed).toEqual({
			errors: [
				{
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

	test("fails to parse an implicit value", async () => {
		const argv = AP3.ArgvItem.normalize(["--verbose"]);
		const parsed = await AP3.parse(
			c.flag({
				long: "verbose",
				type: c.extendType(c.boolean, async (v) => {
					throw new Error(`Never accepting ${v}`);
				}),
			}).parser3,
			argv,
		);
		expect(parsed).toEqual({
			errors: [
				AP3.ParsingError.make(argv[0], new Error("Never accepting true")),
			],
			remainingArgv: [],
			result: null,
		});
	});
});

describe("short", () => {
	test("parses a default type to true", async () => {
		const parsed = await AP3.parse(
			c.flag({ short: "v", long: "verbose" }).parser3,
			AP3.ArgvItem.normalize(["-v"]),
		);
		expect(parsed).toEqual({
			errors: [],
			remainingArgv: [],
			result: { value: true },
		});
	});

	test("parses an explicit value", async () => {
		const parsed = await AP3.parse(
			c.flag({ short: "v", long: "verbose" }).parser3,
			AP3.ArgvItem.normalize(["-v=true"]),
		);
		expect(parsed).toEqual({
			errors: [],
			remainingArgv: [],
			result: { value: true },
		});
	});

	test("fails to parse an explicit value", async () => {
		const parsed = await AP3.parse(
			c.flag({ short: "v", long: "verbose" }).parser3,
			AP3.ArgvItem.normalize(["-v=yo"]),
		);
		expect(parsed).toEqual({
			errors: [
				{
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
