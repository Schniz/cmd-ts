import chalk from "chalk";
import { expect, test } from "vitest";
import type { ParseContext } from "../src/argparser";
import { command } from "../src/command";
import { errorBox } from "../src/errorBox";
import { parseArguments } from "../src/newparser/parseArguments";
import type { AstNode } from "../src/newparser/parser";
import { positional } from "../src/positional";
import { parse, runSafely } from "../src/runner";
import { subcommands } from "../src/subcommands";
import { createRegisterOptions } from "./createRegisterOptions";

test("positional lookup consumes only the first unvisited positional", async () => {
	const nodes = parseArguments(
		["first", "--flag", "--", "second", "third"],
		createRegisterOptions(),
	);
	const context: ParseContext = { nodes, visitedNodes: new Set([nodes[0]]) };
	const arg = positional();
	expect(await arg.parse(context)).toEqual({ _tag: "ok", value: "second" });
	expect(context.visitedNodes.has(nodes[3])).toBe(true);
	expect(context.visitedNodes.has(nodes[4])).toBe(false);
	// No positional cache: edits to the public context are visible immediately.
	nodes.splice(4, 0, { type: "positionalArgument", raw: "inserted", index: 0 });
	expect(await arg.parse(context)).toEqual({ _tag: "ok", value: "inserted" });
	expect(await arg.parse(context)).toEqual({ _tag: "ok", value: "third" });
	expect((await arg.parse(context))._tag).toBe("error");
});

test("subcommand lookup preserves alias precedence and sees mutations", async () => {
	const first = command({
		name: "first",
		aliases: ["second"],
		args: {},
		handler: () => "first",
	});
	const second = command({ name: "second", args: {}, handler: () => "second" });
	const cmds = { first, second };
	const cli = subcommands({ name: "cli", cmds });
	expect(await runSafely(cli, ["second"])).toEqual({
		_tag: "ok",
		value: { command: "first", value: "first" },
	});
	first.aliases?.splice(0);
	expect(await runSafely(cli, ["second"])).toEqual({
		_tag: "ok",
		value: { command: "second", value: "second" },
	});
	cmds.first = command({
		name: "replacement",
		aliases: ["new-alias"],
		args: {},
		handler: () => "replacement",
	});
	expect(await runSafely(cli, ["new-alias"])).toEqual({
		_tag: "ok",
		value: { command: "first", value: "replacement" },
	});
	const typo = await parse(cli, ["secon"]);
	expect(typo._tag).toBe("error");
	if (typo._tag === "error")
		expect(typo.error.errors[0].message).toContain("Did you mean");
});

test("error highlighting retains order, identity, bundled shorts and duplicates", () => {
	const a = { type: "shortOption", key: "a", raw: "a", index: 1 } as const;
	const b = { type: "shortOption", key: "b", raw: "b", index: 2 } as const;
	const long = {
		type: "longOption",
		key: "other",
		raw: "--other",
		index: 4,
	} as const;
	const nodes: AstNode[] = [
		{ type: "shortOptions", raw: "-ab", options: [a, b], index: 0 },
		long,
	];
	const previousLevel = chalk.level;
	chalk.level = 1;
	try {
		const output = errorBox(
			nodes,
			[{ nodes: [long, b, b], message: "bad arguments" }],
			["cli"],
		);
		expect(output).toContain(
			`${chalk.red("-")}${chalk.dim("a")}${chalk.red("b")} ${chalk.red("--other")}`,
		);
		const sameShape = { ...long };
		const identityOutput = errorBox(
			[long],
			[{ nodes: [sameShape, sameShape], message: "not the same node" }],
			[],
		);
		expect(identityOutput).toContain(chalk.dim(long.raw));
		expect(identityOutput).not.toContain(chalk.red(long.raw));
	} finally {
		chalk.level = previousLevel;
	}
});
