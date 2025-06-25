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

export function all<const T extends readonly Parser<any>[]>(
	parsers: T,
): Parser<{
	[K in keyof T]: Parser.Type<T[K]>;
}> {
	return new Parser(async function* () {
		const results: any[] = new Array(parsers.length).fill(undefined);
		const allErrors: ParsingError[] = [];
		
		// Initialize all parser generators
		const generators = parsers.map(parser => parser.gen());
		const states = await Promise.all(generators.map(gen => gen.next()));
		
		// Keep track of which parsers are still active (not done)
		const activeParsers = new Set(parsers.map((_, i) => i));
		
		// Cooperative scheduler: cycle through parsers until all are done
		while (activeParsers.size > 0) {
			let schedulerMadeProgress = false;
			
			// Give each active parser a turn
			for (const i of Array.from(activeParsers)) {
				const gen = generators[i];
				let state = states[i];
				
				// If parser is done, collect result and remove from active set
				if (state.done) {
					results[i] = state.value;
					activeParsers.delete(i);
					schedulerMadeProgress = true;
					continue;
				}
				
				// Run parser until it yields (continue) or finishes
				let parserYielded = false;
				let parserErrors: ParsingError[] = [];
				
				try {
					while (!state.done && !parserYielded) {
						const yieldedValue = state.value as Yieldable;
						const key = yieldedValue.key;
						const payload = yieldedValue.payload;
						
						switch (key) {
							case "peek": {
								const result = yield { key, payload };
								state = await gen.next(result);
								states[i] = state;
								break;
							}
							case "consume": {
								const result = yield { key, payload };
								state = await gen.next(result);
								states[i] = state;
								schedulerMadeProgress = true;
								break;
							}
							case "continue": {
								// In the all combinator, continue should return true
								// to allow parsers to keep looking through the argument stream
								state = await gen.next([key, true]);
								states[i] = state;
								parserYielded = true; // Yield to scheduler
								break;
							}
							case "break": {
								// Collect errors and mark parser as done
								parserErrors.push(...payload);
								allErrors.push(...parserErrors);
								state = await gen.return({} as never);
								states[i] = state;
								activeParsers.delete(i);
								schedulerMadeProgress = true;
								break;
							}
						}
					}
					
					// If parser finished naturally, collect result
					if (state.done) {
						results[i] = state.value;
						activeParsers.delete(i);
						schedulerMadeProgress = true;
					}
					
				} catch (error) {
					// Handle unexpected errors
					allErrors.push(
						ParsingError.forUnknownArgv(
							error instanceof Error ? error : new Error(String(error))
						)
					);
					activeParsers.delete(i);
					schedulerMadeProgress = true;
				}
			}
			
			// If no parser made progress, we're stuck - break out
			if (!schedulerMadeProgress) {
				break;
			}
		}
		
		// Collect any remaining results
		for (const i of activeParsers) {
			const state = states[i];
			if (state.done) {
				results[i] = state.value;
			}
		}

		// If any parser failed, fail the whole combinator
		if (allErrors.length > 0) {
			return yield* effects.break(...allErrors);
		}

		return results as {
			[K in keyof T]: Parser.Type<T[K]>;
		};
	});
}

export async function parse<T>(
	parser: Parser<T>,
	argv: ArgvItem[],
): Promise<ParseResult<T>> {
	const remainingArgv = [...argv];
	const errors: ParsingError[] = [];
	let position = 0;
	const consumedIndices = new Set<number>();
	let lastConsumedCount = 0;

	const effects: Effects = {
		peek(count: number): ArgvItem[] {
			return remainingArgv.slice(position, position + count);
		},

		consume(count: number): ArgvItem[] {
			const consumed = remainingArgv.slice(position, position + count);
			// Mark these indices as consumed
			for (let i = position; i < position + count; i++) {
				consumedIndices.add(i);
			}
			position += count;
			return consumed;
		},

		continue(): boolean {
			// For cooperative scheduling, continue if we made progress (consumed something)
			// or if we haven't reached the end yet
			const currentConsumedCount = consumedIndices.size;
			const madeProgress = currentConsumedCount > lastConsumedCount;
			lastConsumedCount = currentConsumedCount;

			if (madeProgress) {
				// We consumed something, continue from current position
				return position < remainingArgv.length;
			}

			// No progress made, advance position to avoid infinite loop
			position++;
			return position < remainingArgv.length;
		},

		break(...parsingErrors: ParsingError[]): never {
			errors.push(...parsingErrors);
			throw new Error("Parser break");
		},
	};

	try {
		const gen = parser.gen();
		let state = await gen.next();

		while (!state.done) {
			const { key, payload } = state.value;

			// Yield control to the event loop for cooperative scheduling
			await new Promise((resolve) => setImmediate(resolve));

			switch (key) {
				case "peek": {
					const result = effects.peek(...payload);
					state = await gen.next([key, result]);
					break;
				}
				case "consume": {
					const result = effects.consume(...payload);
					state = await gen.next([key, result]);
					break;
				}
				case "continue": {
					const result = effects.continue(...payload);
					state = await gen.next([key, result]);
					break;
				}
				case "break": {
					try {
						effects.break(...payload);
					} catch {
						// Expected - break throws
					}
					state = await gen.return({} as never);
					break;
				}
			}
		}

		return {
			errors,
			result: errors.length > 0 ? null : { value: state.value },
			remainingArgv: remainingArgv.filter(
				(_, index) => !consumedIndices.has(index),
			),
		};
	} catch (error) {
		const allErrors =
			errors.length > 0
				? errors
				: [
						ParsingError.forUnknownArgv(
							error instanceof Error ? error : new Error(String(error)),
						),
					];

		return {
			errors: allErrors,
			result: null,
			remainingArgv: remainingArgv.filter(
				(_, index) => !consumedIndices.has(index),
			),
		};
	}
}
