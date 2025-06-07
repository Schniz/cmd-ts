import { expect, test } from "vitest";
import * as Result from "../src/Result";
import { type AstNode, parse } from "../src/newparser/parser";
import { tokenize } from "../src/newparser/tokenizer";
import { restPositionals } from "../src/restPositionals";
import { createRegisterOptions } from "./createRegisterOptions";
import { number } from "./test-types";

test("fails on specific positional", async () => {
	const argv = "10 20 --mamma mia hello 40";
	const tokens = tokenize(argv.split(" "));
	const nodes = parse(tokens, createRegisterOptions());
	const argparser = restPositionals({
		type: number,
	});

	const result = argparser.parse({ nodes, visitedNodes: new Set() });

	await expect(result).resolves.toEqual(
		Result.err({
			errors: [
				{
					nodes: nodes.filter((x) => x.raw === "hello"),
					message: "Not a number",
				},
			],
		}),
	);
});

test("succeeds when all unused positional decode successfuly", async () => {
	const argv = "10 20 --mamma mia hello 40";
	const tokens = tokenize(argv.split(" "));
	const nodes = parse(tokens, createRegisterOptions());
	const argparser = restPositionals({
		type: number,
	});

	const visitedNodes = new Set<AstNode>();
	const alreadyUsedNode = nodes.find((x) => x.raw === "hello");
	if (!alreadyUsedNode) {
		throw new Error("Node `hello` not found. please rewrite the find function");
	}
	visitedNodes.add(alreadyUsedNode);

	const result = argparser.parse({ nodes, visitedNodes });

	await expect(result).resolves.toEqual(Result.ok([10, 20, 40]));
});
