import { inspect } from "node:util";
import {
	command,
	number,
	option,
	optional,
	positional,
	run,
	string,
	subcommands,
} from "../src";

const sub1 = command({
	name: "sub1",
	args: {
		name: option({ type: string, long: "name" }),
	},
	handler: ({ name }) => {
		console.log({ name });
	},
});

const sub2 = command({
	name: "sub2",
	args: {
		age: positional({ type: optional(number) }),
		name: positional({
			type: {
				...string,
				defaultValue: () => "anonymous",
				defaultValueIsSerializable: true,
			},
		}),
	},
	handler({ name, age }) {
		console.log(inspect({ name, age }));
	},
});

const nested = subcommands({
	name: "subcmds",
	cmds: {
		sub1,
		sub2,
	},
});

run(nested, process.argv.slice(2));
