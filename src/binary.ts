import { Runner } from './runner';
import { ParseContext } from './argparser';
import { Named } from './helpdoc';

export function binary<Command extends Runner<any, any> & Named>(
  cmd: Command
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
