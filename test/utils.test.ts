import chalk from "chalk";
import stripAnsi from "strip-ansi";
import { describe, expect, it } from "vitest";
import { expectTypeOf } from "vitest";
import { type AllOrNothing, padNoAnsi } from "../src/utils";

describe("padNoAnsi", () => {
	it("pads start", () => {
		const expected = "hello".padStart(10, " ");
		const actual = padNoAnsi(
			[
				chalk.red("h"),
				chalk.cyan("e"),
				chalk.blue("l"),
				chalk.green("l"),
				chalk.red("o"),
			].join(""),
			10,
			"start",
		);
		expect(stripAnsi(actual)).toEqual(expected);
	});
	it("pads end", () => {
		const expected = "hello".padEnd(10, " ");
		const actual = padNoAnsi(
			[
				chalk.red("h"),
				chalk.cyan("e"),
				chalk.blue("l"),
				chalk.green("l"),
				chalk.red("o"),
			].join(""),
			10,
			"end",
		);
		expect(stripAnsi(actual)).toEqual(expected);
	});
	it("returns the string if it is shorter than the padding", () => {
		const str = chalk`{red h}{cyan e}{blue l}{green l}{red o}`;
		const actual = padNoAnsi(str, 2, "end");
		expect(actual).toEqual(str);
	});
});

it("allows to provide all arguments or none", () => {
	type Person = { name: string; age: number };
	expectTypeOf<{ name: "Joe"; age: 100 }>().toExtend<AllOrNothing<Person>>();
	expectTypeOf<{ name: "Joe" }>().not.toExtend<AllOrNothing<Person>>();
	expectTypeOf<{}>().toExtend<AllOrNothing<Person>>();
});
