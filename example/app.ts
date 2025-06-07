#!/usr/bin/env YARN_SILENT=1 yarn ts-node

/* istanbul ignore file */

import { Integer, ReadStream } from "./test-types";
import {
	command,
	subcommands,
	run,
	binary,
	string,
	boolean,
	flag,
	option,
	positional,
	optional,
	restPositionals,
	extendType,
	union,
	number,
} from "../src";

const complex = command({
	version: "6.6.6-alpha",
	args: {
		pos1: positional({
			displayName: "pos1",
			type: Integer,
		}),
		pos2: positional(),
		named1: option({
			type: Integer,
			short: "n",
			long: "number",
		}),
		intOrString: option({
			type: union([Integer, string]),
			long: "int-or-string",
		}),
		floatOrString: option({
			type: union([number, string]),
			long: "float-or-string",
		}),
		optionalOption: option({
			type: optional(string),
			long: "optional-option",
		}),
		optionWithoutType: option({
			long: "no-type-option",
		}),
		optionWithDefault: option({
			long: "optional-with-default",
			env: "SOME_ENV_VAR",
			type: {
				...string,
				defaultValue: () => "Hello",
				defaultValueIsSerializable: true,
			},
		}),
		bool: flag({
			type: boolean,
			long: "boolean",
		}),
		boolWithoutType: flag({ long: "bool-without-type" }),
		rest: restPositionals(),
	},
	name: "printer",
	description: "Just prints the arguments",
	handler: (args) => {
		/** @export complex -> intOrString */
		const x = args.intOrString;

		/** @export complex -> floatOrString */
		const y = args.floatOrString;

		/** @export complex -> pos2 */
		const pos2 = args.pos2;

		/** @export complex -> boolWithoutType */
		const boolWithoutType = args.boolWithoutType;

		/** @export complex -> optionWithoutType */
		const optionWithoutType = args.optionWithoutType;

		/** @export complex -> rest */
		const restPos = args.rest;

		console.log(
			`I got`,
			args,
			x,
			y,
			pos2,
			optionWithoutType,
			boolWithoutType,
			restPos,
		);
	},
});

const withStream = command({
	args: {
		stream: positional({
			displayName: "stream",
			type: ReadStream,
		}),
		restStreams: restPositionals({
			displayName: "stream",
			type: ReadStream,
		}),
	},
	description: "A simple `cat` clone",
	name: "cat",
	aliases: ["read"],
	handler: (result) => {
		/** @export cat -> stream */
		const stream = result.stream;
		/** @export cat -> restStreams */
		const restStreams = result.restStreams;
		[stream, ...restStreams].forEach((s) => s.pipe(process.stdout));
	},
});

const composed = subcommands({
	name: "another-command",
	cmds: {
		cat: withStream,
	},
	description: "a nested subcommand",
});

const Name = extendType(string, {
	async from(s) {
		if (s.length === 0) {
			throw new Error("name cannot be empty");
		} else if (s === "Bon Jovi") {
			throw new Error(`Woah, we're half way there\nWoah! living on a prayer!`);
		} else if (s.charAt(0).toUpperCase() !== s.charAt(0)) {
			throw new Error("name must be capitalized");
		} else {
			return s;
		}
	},
	displayName: "name",
});

const withSubcommands = subcommands({
	cmds: {
		complex,
		cat: withStream,
		greet: command({
			name: "greet",
			description: "greet a person",
			args: {
				times: option({
					type: { ...Integer, defaultValue: () => 1 },
					long: "times",
				}),
				name: positional({
					displayName: "name",
					type: Name,
				}),
				noExclaim: flag({
					type: boolean,
					long: "no-exclaim",
				}),
				greeting: option({
					long: "greeting",
					type: string,
					description: "the greeting to say",
					env: "GREETING_NAME",
				}),
			},
			handler: (result) => {
				const args = result;
				/** @export greet -> greeting */
				const greeting = args.greeting;
				/** @export greet -> noExclaim */
				const noExclaim = args.noExclaim;
				/** @export greet -> name */
				const name = args.name;
				const exclaim = noExclaim ? "" : "!";
				console.log(`${greeting}, ${name}${exclaim}`);
			},
		}),
		composed,
	},
	name: "subcmds",
	description: "An awesome subcommand app!",
	version: "1.0.0",
});

const cli = binary(withSubcommands);

async function main() {
	await run(cli, process.argv);
}

main();
