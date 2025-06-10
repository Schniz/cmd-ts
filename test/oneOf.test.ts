import { oneOf, type Type } from "../src";
import { test, expectTypeOf } from "vitest";

test("defaults to narrow types", () => {
	const value = oneOf(["a", "b"]);
	expectTypeOf(value).toEqualTypeOf<Type<string, "a" | "b">>();
});
