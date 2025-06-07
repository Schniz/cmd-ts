import { command, rest, binary, run, positional } from "../src";

const cmd = command({
	args: {
		scriptName: positional(),
		everythingElse: rest(),
	},
	name: "hi",
	handler({ scriptName, everythingElse }) {
		console.log(JSON.stringify({ scriptName, everythingElse }));
	},
});

run(binary(cmd), process.argv);
