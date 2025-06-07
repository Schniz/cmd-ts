import type { ParseContext } from "./argparser";
import type { Named } from "./helpdoc";
import type { Runner } from "./runner";

/**
 * A small helper to easily use `process.argv` without dropping context
 *
 * @param cmd a command line parser
 */
export function binary<Command extends Runner<any, any> & Named>(
	cmd: Command,
): Command {
	return {
		...cmd,
		run(context: ParseContext) {
			const name = cmd.name || context.nodes[1].raw;
			context.hotPath?.push(name);
			context.nodes.splice(0, 1);
			context.nodes[0].raw = name;
			context.visitedNodes.add(context.nodes[0]);
			return cmd.run(context);
		},
	};
}
