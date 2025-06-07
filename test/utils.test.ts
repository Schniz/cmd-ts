import chalk from "chalk";
import stripAnsi from "strip-ansi";
import { describe, expect, it } from "vitest";
import { type AllOrNothing, padNoAnsi } from "../src/utils";

describe("padNoAnsi", () => {
	it("pads start", () => {
		const expected = "hello".padStart(10, " ");
		const actual = padNoAnsi(
			chalk`{red h}{cyan e}{blue l}{green l}{red o}`,
			10,
			"start",
		);
		expect(stripAnsi(actual)).toEqual(expected);
	});
	it("pads end", () => {
		const expected = "hello".padEnd(10, " ");
		const actual = padNoAnsi(
			chalk`{red h}{cyan e}{blue l}{green l}{red o}`,
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

it("passes type tests", () => {
	function identity<T>(t: T): T {
		return t;
	}

	expect(identity<TypeTests.test>("true")).toEqual("true");
});

namespace TypeTests {
	type Extends<A, B> = B extends A ? "true" : "false";
	type AssertTrue<A extends "true"> = Extends<"true", A>;
	type AssertFalse<A extends "false"> = Extends<"false", A>;
	type AllTrue<A extends "true"[]> = Extends<"true"[], A>;

	namespace AllOrNothingTests {
		type Person = { name: string; age: number };

		type accepts_all_elements = AssertTrue<
			Extends<AllOrNothing<Person>, { name: "Joe"; age: 100 }>
		>;

		type does_not_accept_partial = AssertFalse<
			Extends<AllOrNothing<Person>, { name: "joe" }>
		>;

		type accepts_nothing = AssertTrue<Extends<AllOrNothing<Person>, {}>>;

		export type test = AssertTrue<
			AllTrue<[accepts_all_elements, does_not_accept_partial, accepts_nothing]>
		>;
	}

	export type test = AllTrue<[AllOrNothingTests.test]>;
}
