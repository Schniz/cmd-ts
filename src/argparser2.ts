export class ArgvItem {
	constructor(
		/**
		 * The original value, coming from process.argv
		 */
		readonly value: string,

		/**
		 * The original index position in the argv array
		 * so we can track it in error messages.
		 */
		readonly index: number,

		readonly span?: [from: number, to: number],
	) {}

	spanned(from: number, to: number): ArgvItem {
		return new ArgvItem(this.value.slice(from, to), this.index, [from, to]);
	}

	static normalize(argv: string[] | ArgvItem[]): ArgvItem[] {
		if (argv.length === 0) {
			return [];
		}

		if (typeof argv[0] !== "string") {
			return argv as ArgvItem[];
		}

		return argv.map((value, index) => new ArgvItem(value as string, index));
	}
}

export class ParsingError {
	constructor(
		readonly argv: ArgvItem | "unknown",
		readonly cause: Error,
		readonly atomic?: true,
	) {}

	asAtomic(): ParsingError {
		return new ParsingError(this.argv, this.cause, true);
	}
	static make(argv: ArgvItem, cause: Error) {
		return new ParsingError(argv, cause);
	}
	static forUnknownArgv(cause: Error) {
		return new ParsingError("unknown", cause);
	}
}

export interface ParseResult<T> {
	errors: ParsingError[];
	result: Option<T>;
	remainingArgv: ArgvItem[];
	continue?: true;
}

type Option<T> = null | { value: T };

export interface ArgParser2<T> {
	parse2(argv: ArgvItem[]): Promise<ParseResult<T>>;
}
