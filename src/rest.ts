import type { ArgParser } from "./argparser";
import type { Descriptive, Displayed, ProvidesHelp } from "./helpdoc";
import * as Result from "./Result";

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
			if (visitedNodeIndices.length === 0) {
				return Result.ok([]);
			}

			const maxIndex = Math.max(...visitedNodeIndices);
			const restItems = context.nodes.slice(maxIndex + 1);
			restItems.forEach((node) => context.visitedNodes.add(node));
			return Result.ok(restItems.map((x) => x.raw));
		},
	};
}
