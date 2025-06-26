import * as AP3 from "./argparser3";

/**
 * Creates a parser that matches command-line options with double-dash (--) or single-dash (-) syntax.
 *
 * This function handles various flag formats:
 * - Long flags: `--verbose`
 * - Long flags with values: `--verbose=true`
 * - Short flags: `-v` (if short option is provided)
 * - Short flags with values: `-v=true` (if short option is provided)
 */
export function doubleDashOption(config: { long: string; short?: string }) {
	return AP3.match(
		(
			arg,
		):
			| null
			| ["short" | "long", definition: AP3.ArgvItem, value?: AP3.ArgvItem] => {
			if (arg.value === `--${config.long}`) {
				return ["long", arg];
			}

			if (arg.value.startsWith(`--${config.long}=`)) {
				return [
					"long",
					arg,
					arg.spanned(`--${config.long}=`.length, arg.value.length),
				];
			}

			if (config.short) {
				if (arg.value === `-${config.short}`) {
					return ["short", arg];
				}

				if (arg.value.startsWith(`-${config.short}=`)) {
					return [
						"short",
						arg,
						arg.spanned(`-${config.short}=`.length, arg.value.length),
					];
				}
			}

			return null;
		},
	);
}
