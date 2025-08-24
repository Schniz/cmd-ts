import { expect, test } from "vitest";
import { rest } from "../src";
import * as Result from "../src/Result";
import { type AstNode, parse } from "../src/newparser/parser";
import { tokenize } from "../src/newparser/tokenizer";
import { createRegisterOptions } from "./createRegisterOptions";

// test("fails on specific positional", async () => {
// 	const argv = "10 20 --mamma mia hello 40";
// 	const tokens = tokenize(argv.split(" "));
// 	const nodes = parse(tokens, createRegisterOptions());
// 	const argparser = rwrestPositionals({
// 		type: number,
// 	});
//
// 	const result = argparser.parse({ nodes, visitedNodes: new Set() });
//
// 	await expect(result).resolves.toEqual(
// 		Result.err({
// 			errors: [
// 				{
// 					nodes: nodes.filter((x) => x.raw === "hello"),
// 					message: "Not a number",
// 				},
// 			],
// 		}),
// 	);
// });

test("succeeds", async () => {
	const argv = "10 20 --mamma mia hello --hey=ho 40";
	const tokens = tokenize(argv.split(" "));
	const nodes = parse(tokens, createRegisterOptions());
	const argparser = rest();

	const visitedNodes = new Set<AstNode>();
	const result = argparser.parse({ nodes, visitedNodes });

	await expect(result).resolves.toEqual(
		Result.ok(["10", "20", "--mamma", "mia", "hello", "--hey=ho", "40"]),
	);
});
