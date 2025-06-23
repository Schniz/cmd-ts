import * as c from "../src";
import { ArgvItem } from "../src/argparser2";
import { describe, expect, test } from "vitest";
import { exclaim } from "./test-types";

describe("parses an option", () => {
	test("no args provided", async () => {
		const parsed = await c.option({ long: "greeting" }).parse2([]);
		expect(parsed).toMatchObject({
			errors: [
				{
					argv: "unknown",
					cause: new Error(`No value provided for required option "greeting"`),
				},
			],
			result: null,
			remainingArgv: [],
		});
	});

	test("defaultValue with no args provided", async () => {
		const parsed = await c
			.option({ long: "greeting", defaultValue: () => "yellow" })
			.parse2([]);
		expect(parsed).toMatchObject({
			errors: [],
			result: { value: "yellow" },
			remainingArgv: [],
		});
	});

	test("optional works", async () => {
		const parsed = await c
			.option({ long: "greeting", type: c.optional(c.string) })
			.parse2([]);
		expect(parsed).toMatchObject({
			errors: [],
			result: { value: undefined },
			remainingArgv: [],
		});
	});

	test("an arg provided but it's not in the first position", async () => {
		// We only read the first argument for the option, so the second one is ignored.
		const parsed = await c
			.option({ long: "greeting" })
			.parse2(ArgvItem.normalize(["--name=hello", "--greeting=yellow"]));
		expect(parsed).toMatchObject({
			errors: [
				{
					cause: new Error(`No value provided for required option "greeting"`),
					argv: "unknown",
				},
			],
			result: null,
			remainingArgv: ArgvItem.normalize(["--name=hello", "--greeting=yellow"]),
		});
	});

	test("defaultValue with an arg provided but it's not in the first position", async () => {
		// We only read the first argument for the option, so the second one is ignored.
		const parsed = await c
			.option({ long: "greeting", defaultValue: () => "yellow" })
			.parse2(ArgvItem.normalize(["--name=hello", "--greeting=yellow"]));
		expect(parsed).toMatchObject({
			errors: [],
			result: { value: "yellow" },
			remainingArgv: ArgvItem.normalize(["--name=hello", "--greeting=yellow"]),
		});
	});

	describe("long", () => {
		test("parses a single element with =", async () => {
			const parsed = await c
				.option({ long: "greeting", type: exclaim })
				.parse2(ArgvItem.normalize(["--greeting=yellow", "--name=hello"]));
			expect(parsed).toMatchObject({
				errors: [],
				result: { value: "yellow!" },
				remainingArgv: [{ index: 1, value: "--name=hello" }],
			});
		});

		test("parse errors on a single element with =", async () => {
			const parsed = await c
				.option({ long: "greeting", type: exclaim })
				.parse2(ArgvItem.normalize(["--greeting=yellow!", "--name=hello"]));
			expect(parsed).toMatchObject({
				errors: [
					{
						argv: { index: 0, span: [11, 18], value: "yellow!" },
						cause: new Error(`Value should not end with '!'`),
					},
				],
				result: null,
				remainingArgv: [{ index: 1, value: "--name=hello" }],
			});
		});

		test("parses whitespace delimited --key value", async () => {
			const parsed = await c
				.option({ long: "greeting", type: exclaim })
				.parse2(ArgvItem.normalize(["--greeting", "yellow", "--name=hello"]));
			expect(parsed).toMatchObject({
				errors: [],
				result: { value: "yellow!" },
				remainingArgv: [{ index: 2, value: "--name=hello" }],
			});
		});

		test("missing value on --key value", async () => {
			const parsed = await c
				.option({ long: "greeting", type: exclaim })
				.parse2(ArgvItem.normalize(["--greeting"]));
			expect(parsed).toMatchObject({
				errors: [
					{
						argv: { index: 0, value: "--greeting" },
						cause: new Error(`Missing value for option "greeting"`),
					},
				],
				result: null,
				remainingArgv: [],
			});
		});

		test("parse errors on whitespace delimited --key value", async () => {
			const parsed = await c
				.option({ long: "greeting", type: exclaim })
				.parse2(ArgvItem.normalize(["--greeting", "yellow!", "--name=hello"]));
			expect(parsed).toMatchObject({
				errors: [
					{
						argv: { index: 1, value: "yellow!" },
						cause: new Error(`Value should not end with '!'`),
					},
				],
				result: null,
				remainingArgv: [{ index: 2, value: "--name=hello" }],
			});
		});
	});

	describe("short", () => {
		test("parses a single element with =", async () => {
			const parsed = await c
				.option({ short: "g", long: "greeting", type: exclaim })
				.parse2(ArgvItem.normalize(["-g=yellow", "--name=hello"]));
			expect(parsed).toMatchObject({
				errors: [],
				result: { value: "yellow!" },
				remainingArgv: [{ index: 1, value: "--name=hello" }],
			});
		});

		test("parse errors on a single element with =", async () => {
			const parsed = await c
				.option({ short: "g", long: "greeting", type: exclaim })
				.parse2(ArgvItem.normalize(["-g=yellow!", "--name=hello"]));
			expect(parsed).toMatchObject({
				errors: [
					{
						argv: { index: 0, span: [3, 10], value: "yellow!" },
						cause: new Error(`Value should not end with '!'`),
					},
				],
				result: null,
				remainingArgv: [{ index: 1, value: "--name=hello" }],
			});
		});

		test("parses whitespace delimited -k value", async () => {
			const parsed = await c
				.option({ short: "g", long: "greeting", type: exclaim })
				.parse2(ArgvItem.normalize(["-g", "yellow", "--name=hello"]));
			expect(parsed).toMatchObject({
				errors: [],
				result: { value: "yellow!" },
				remainingArgv: [{ index: 2, value: "--name=hello" }],
			});
		});

		test("missing value on -k value", async () => {
			const parsed = await c
				.option({ short: "g", long: "greeting", type: exclaim })
				.parse2(ArgvItem.normalize(["-g"]));
			expect(parsed).toMatchObject({
				errors: [
					{
						argv: { index: 0, value: "-g" },
						cause: new Error(`Missing value for option "g" ("greeting")`),
					},
				],
				result: null,
				remainingArgv: [],
			});
		});

		test("parse errors on whitespace delimited -k value", async () => {
			const parsed = await c
				.option({ short: "g", long: "greeting", type: exclaim })
				.parse2(ArgvItem.normalize(["-g", "yellow!", "--name=hello"]));
			expect(parsed).toMatchObject({
				errors: [
					{
						argv: { index: 1, value: "yellow!" },
						cause: new Error(`Value should not end with '!'`),
					},
				],
				result: null,
				remainingArgv: [{ index: 2, value: "--name=hello" }],
			});
		});
	});
});
