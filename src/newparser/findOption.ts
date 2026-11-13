import type { AstNode, LongOption, ShortOption } from "./parser";

type Option = LongOption | ShortOption;

/**
 * A utility function to find an option in the AST
 *
 * @param nodes AST node list
 * @param opts Long and short names to look up
 */
export function findOption(
	nodes: AstNode[],
	opts: {
		longNames: string[];
		shortNames: string[];
	},
): Option[] {
	const result: Option[] = [];
	// Most decoders look up one name. Avoid an includes call for every AST node.
	const longName = opts.longNames[0];
	const shortName = opts.shortNames[0];
	const multipleLongNames = opts.longNames.length > 1;
	const multipleShortNames = opts.shortNames.length > 1;

	for (const node of nodes) {
		if (
			node.type === "longOption" &&
			(node.key === longName ||
				(multipleLongNames && opts.longNames.includes(node.key)))
		) {
			result.push(node);
			continue;
		}

		if (node.type === "shortOptions" && opts.shortNames.length) {
			for (const option of node.options) {
				if (
					option.key === shortName ||
					(multipleShortNames && opts.shortNames.includes(option.key))
				) {
					result.push(option);
				}
			}
		}
	}

	return result;
}
