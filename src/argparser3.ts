import assert from "node:assert";

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
}

export type Option<T> = null | { value: T };

export interface Effects {
	/** Get the next `count` items from the argv */
	peek(count: number): ArgvItem[];
	/** Consume the next `count` items from the argv, declaring them as used so other parsers can't touch them. */
	consume(count: number): ArgvItem[];
	/** Yield the cooperative parser, and return whether we can continue parsing with the current parser. */
	continue(): boolean;
	/** Throw a parsing error */
	break(...errors: ParsingError[]): never;
}

export type Yieldable = {
	[key in keyof Effects]: { key: key; payload: Parameters<Effects[key]> };
}[keyof Effects];
//   ^?
export type YieldResult = {
	[key in keyof Effects]: readonly [key, ReturnType<Effects[key]>];
}[keyof Effects];
//   ^?

export type ParserGen<T> = AsyncGenerator<Yieldable, T, YieldResult>;

export type EffectsGens = {
	[key in keyof Effects]: (
		...args: Parameters<Effects[key]>
	) => Parser<ReturnType<Effects[key]>>;
};

export const effects = new Proxy({} as EffectsGens, {
	get(target, prop: string, receiver: any) {
		if (!(prop in target)) {
			const fn = (...args: any): Parser<any> =>
				new Parser(async function* () {
					const [key, ret] = yield {
						key: prop as keyof Effects,
						payload: args,
					};
					assert(key === prop, `Expected effect ${prop}, got ${key}`);
					return ret;
				});
			Reflect.set(target, prop, fn, receiver);
		}
		return Reflect.get(target, prop, receiver);
	},
});

export class Parser<T> {
	constructor(readonly gen: () => ParserGen<T>) {}
	[Symbol.asyncIterator](): ParserGen<T> {
		return this.gen();
	}

	withConsumed(): Parser<[T, ArgvItem[]]> {
		const wrapped = this;
		return new Parser<[T, ArgvItem[]]>(async function* () {
			const gen = wrapped.gen();
			const trapped: ArgvItem[] = [];
			let state = await gen.next(["continue", true]);
			while (true) {
				if (state.done) {
					return [state.value, trapped];
				}

				const { key, payload } = state.value;
				switch (key) {
					case "consume": {
						const removed = yield* effects.consume(...payload);
						trapped.push(...removed);
						state = await gen.next(["consume", removed]);
						break;
					}
					case "peek": {
						const res = yield { key, payload };
						state = await gen.next(res);
						break;
					}
					case "break": {
						const res = yield { key, payload };
						state = await gen.next(res);
						break;
					}
					case "continue": {
						const res = yield { key, payload };
						state = await gen.next(res);
						break;
					}
				}
			}
		});
	}
}

export namespace Parser {
	export type Type<T> = T extends Parser<infer U> ? U : never;
	export type IterResult<T> = IteratorResult<Yieldable, T>;
}

export const createFlag = (name: string) =>
	new Parser(async function* () {
		do {
			const value = yield* effects.peek(1);
			if (!value.length) break;
			if (value[0].value === `--${name}`) {
				yield* effects.consume(1);
				return true;
			}
		} while (yield* effects.continue());

		return false;
	});

export const createMultiFlag = (name: string) =>
	new Parser(async function* () {
		let count = 0;
		do {
			const value = yield* effects.peek(1);
			if (!value.length) break;
			if (value[0].value === `--${name}`) {
				yield* effects.consume(1);
				count++;
			}
		} while (yield* effects.continue());
		return count;
	});

export const createRequiredFlag = (name: string) =>
	new Parser(async function* () {
		const prefix = `--${name}=`;
		do {
			const value = yield* effects.peek(1);
			if (!value.length) break;
			if (value[0].value.startsWith(prefix)) {
				yield* effects.consume(1);
				return value[0].value.slice(prefix.length);
			}
		} while (yield* effects.continue());

		return yield* effects.break(
			ParsingError.forUnknownArgv(new Error(`Missing value for --${name}`)),
		);
	});
