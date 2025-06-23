import * as c from "../src";
import { ArgParser2, ArgvItem } from "../src/argparser2";
import { describe, expect, test, expectTypeOf } from "vitest";
import { exclaim } from "./test-types";

describe("command", () => {
	test("parses an empty args array", async () => {
		const value = await c
			.command({ name: "cmd", args: {}, handler() {} })
			.parse2([]);

		expect(value).toEqual({
			errors: [],
			result: { value: {} },
			remainingArgv: [],
		});
	});
	test("parses a single option", async () => {
		const value = await c
			.command({
				name: "cmd",
				args: { opt: c.option({ long: "greeting" }) },
				handler() {},
			})
			.parse2(ArgvItem.normalize(["--greeting=hello", "rest", "arguments"]));

		expect(value).toEqual({
			errors: [],
			result: { value: { opt: "hello" } },
			remainingArgv: [
				{ index: 1, value: "rest" },
				{ index: 2, value: "arguments" },
			],
		});
	});

	test("does not parse a single option", async () => {
		const value = await c
			.command({
				name: "cmd",
				args: { opt: c.option({ long: "greeting" }) },
				handler() {},
			})
			.parse2(ArgvItem.normalize(["rest", "arguments"]));

		expect(value).toEqual({
			errors: [
				{
					argv: "unknown",
					cause: new Error(`No value provided for required option "greeting"`),
				},
			],
			result: { value: {} },
			remainingArgv: [
				{ index: 0, value: "rest" },
				{ index: 1, value: "arguments" },
			],
		});
	});

	test("parses two options", async () => {
		const value = await c
			.command({
				name: "cmd",
				args: {
					greeting: c.option({ long: "greeting", type: exclaim }),
					greeter: c.option({ long: "greeter" }),
				},
				handler() {},
			})
			.parse2(
				ArgvItem.normalize([
					"--greeting",
					"hello",
					"--greeter",
					"gal",
					"rest",
					"arguments",
				]),
			);

		expect(value).toEqual({
			errors: [],
			result: { value: { greeting: "hello!", greeter: "gal" } },
			remainingArgv: [
				{ index: 4, value: "rest" },
				{ index: 5, value: "arguments" },
			],
		});
	});

	test("fails parsing a value", async () => {
		const value = await c
			.command({
				name: "cmd",
				args: {
					greeting: c.option({ long: "greeting", type: exclaim }),
					greeter: c.option({ long: "greeter" }),
					scream: c.flag({ long: "scream" }),
				},
				handler({ greeting, greeter, scream }) {
					expectTypeOf(greeting).toEqualTypeOf<`${string}!`>();
					expectTypeOf(greeter).toEqualTypeOf<string>();
					expectTypeOf(scream).toEqualTypeOf<boolean>();
				},
			})
			.parse2(
				ArgvItem.normalize([
					"--greeting",
					"hello!",
					"--greeter",
					"gal",
					"rest",
					"arguments",
				]),
			);

		expect(value).toEqual({
			errors: [
				{
					argv: {
						index: 1,
						value: "hello!",
					},
					atomic: true,
					cause: new Error(`Value should not end with '!'`),
				},
			],
			result: { value: { greeter: "gal", scream: false } },
			remainingArgv: [
				{ index: 4, value: "rest" },
				{ index: 5, value: "arguments" },
			],
		});
	});

	test("multioption", async () => {
		function multi<T>(parser: ArgParser2<T>): ArgParser2<T[]> {
			return {
				async parse2(argv) {
					const result = await parser.parse2(argv);
					return { ...result, continue: true };
				},
			};
		}

		const value = await c
			.command({
				name: "cmd",
				args: {
					names: multi(c.option({ long: "name", type: exclaim })),
					verbose: c.flag({ long: "verbose" }),
				},
				handler({ greeting, greeter, scream }) {
					// expectTypeOf(greeting).toEqualTypeOf<`${string}!`>();
					// expectTypeOf(greeter).toEqualTypeOf<string>();
					// expectTypeOf(scream).toEqualTypeOf<boolean>();
				},
			})
			.parse2(
				ArgvItem.normalize(["--name=gal", "--verbose", "--name", "schniz"]),
			);

		expect(value).toEqual({});
	});
});
