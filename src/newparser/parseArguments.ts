import createDebugger from "debug";
import type { RegisterOptions } from "../argparser";
import {
	type AstNode,
	type LongOption,
	type ShortOption,
	parse,
} from "./parser";
import { tokenize } from "./tokenizer";

const debug = createDebugger("cmd-ts:parser");

/** Parse argv into the syntax tree used by argument decoders. */
export function parseArguments(
	strings: string[],
	registered: RegisterOptions,
): AstNode[] {
	// Keep the token parser's diagnostic logging and unusual token-boundary
	// behavior. Normal argv can be sliced directly, without per-character tokens.
	if (debug.enabled) return parse(tokenize(strings), registered);
	const nodes: AstNode[] = [];
	let offset = 0;
	let forcedPositional = false;

	for (let i = 0; i < strings.length; i++) {
		const argument = strings[i];
		const index = offset;
		offset += argument.length + 1;
		if (argument.length === 0) return parse(tokenize(strings), registered);

		if (forcedPositional || argument[0] !== "-" || argument === "-") {
			nodes.push({ type: "positionalArgument", index, raw: argument });
			continue;
		}
		if (argument === "--") {
			nodes.push({ type: "forcePositional", index, raw: "--" });
			forcedPositional = true;
			continue;
		}

		const long = argument[1] === "-";
		const prefixLength = long ? 2 : 1;
		const equals = argument.indexOf("=", prefixLength);
		const keys = argument.slice(prefixLength, equals < 0 ? undefined : equals);
		// Empty inline values and dashes inside short bundles have historical
		// token-level semantics. Do not silently change them in this fast path.
		if (
			(equals >= 0 && equals === argument.length - 1) ||
			(!long && (keys.length === 0 || keys.includes("-")))
		) {
			return parse(tokenize(strings), registered);
		}

		// Only the last short option in a bundle can consume a value. Use code
		// points for keys, but UTF-16 offsets for diagnostic positions.
		const shortKeys = long ? [] : Array.from(keys);
		const key = long ? keys : shortKeys[shortKeys.length - 1];
		const flags = long
			? registered.forceFlagLongNames
			: registered.forceFlagShortNames;
		const options = long
			? registered.forceOptionLongNames
			: registered.forceOptionShortNames;
		let value: LongOption["value"];
		let raw = argument;

		if (equals >= 0) {
			const valueRaw = argument.slice(equals + 1);
			value = {
				type: "optionValue",
				index: index + equals,
				delimiter: { type: "delimiter", raw: "=", index: index + equals },
				node: { type: "value", raw: valueRaw, index: index + equals + 1 },
				raw: `=${valueRaw}`,
			};
		} else {
			const next = strings[i + 1];
			if (
				next !== undefined &&
				(options.has(key) || (!flags.has(key) && next[0] !== "-"))
			) {
				if (next.length === 0) return parse(tokenize(strings), registered);
				value = {
					type: "optionValue",
					index: offset - 1,
					delimiter: { type: "delimiter", raw: " ", index: offset - 1 },
					node: { type: "value", raw: next, index: offset },
					raw: ` ${next}`,
				};
				raw += value.raw;
				offset += next.length + 1;
				i++;
			}
		}

		if (long) {
			nodes.push({ type: "longOption", index, key, raw, value });
		} else {
			const shortOptions: ShortOption[] = [];
			let keyIndex = index + 1;
			for (let j = 0; j < shortKeys.length; j++) {
				const shortKey = shortKeys[j];
				if (j === shortKeys.length - 1) {
					shortOptions.push({
						type: "shortOption",
						index: keyIndex,
						key: shortKey,
						raw: shortKey + (value?.raw ?? ""),
						value,
					});
				} else {
					shortOptions.push({
						type: "shortOption",
						index: keyIndex,
						key: shortKey,
						raw: shortKey,
					});
				}
				keyIndex += shortKey.length;
			}
			nodes.push({ type: "shortOptions", index, raw, options: shortOptions });
		}
	}
	return nodes;
}
