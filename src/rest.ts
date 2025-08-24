import * as Result from "./Result";
import type { ArgParser } from "./argparser";
import type { Descriptive, Displayed, ProvidesHelp } from "./helpdoc";
import type { AstNode } from "./newparser/parser";

export function rest(
	config?: Partial<Displayed & Descriptive>,
): ArgParser<string[]> & ProvidesHelp {
	return {
		helpTopics() {
			const displayName = config?.displayName ?? "arg";
			return [
				{
					usage: `[...${displayName}]`,
					category: "arguments",
					defaults: [],
					description: config?.description ?? "catches the rest of the values",
				},
			];
		},
		register() {},
		async parse(context) {
			const visitedNodeIndices = [...context.visitedNodes]
				.map((x) => context.nodes.indexOf(x))
				.filter((x) => x > -1);

			const strings: string[] = [];

			const maxIndex = Math.max(-1, ...visitedNodeIndices);
			const restItems = context.nodes.slice(maxIndex + 1);
			for (const node of restItems) {
				switch (node.type) {
					case "positionalArgument": {
						strings.push(node.raw);
						context.visitedNodes.add(node);
						break;
					}
					case "longOption": {
						strings.push(...getOriginal(node));
						context.visitedNodes.add(node);
						break;
					}
					case "shortOption": {
						strings.push(...getOriginal(node));
						context.visitedNodes.add(node);
						break;
					}
					case "forcePositional": {
						strings.push(node.raw);
						context.visitedNodes.add(node);
						break;
					}
					case "shortOptions": {
						const last = node.options.at(-1);
						context.visitedNodes.add(node);
						strings.push(...getOriginal({ ...node, value: last?.value }));
						break;
					}
				}
			}
			return Result.ok(strings);
		},
	};
}

function getOriginal(node: {
	index: number;
	raw: string;
	value?: Extract<AstNode, { type: "longOption" }>["value"];
}): string[] {
	if (!node.value) {
		return [node.raw];
	}

	if (node.value.delimiter.raw === " ") {
		return [
			node.raw.slice(0, node.value.index - node.index),
			node.value.node.raw,
		];
	}

	return [node.raw];
}
