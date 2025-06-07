import { From, OutputOf, InputOf, FromFn } from "./from";
import { Descriptive, Displayed } from "./helpdoc";
import { Default } from "./default";

export { identity, OutputOf, InputOf } from "./from";

export type Type<From_, To> = From<From_, To> &
	Partial<Descriptive & Displayed & Default<To>>;

/**
 * Get the type definitions or an empty object from a type or a decoding function
 */
export function typeDef<T extends From<any, any> | FromFn<any, any>>(
	from: T,
): T extends FromFn<any, any> ? {} : Omit<T, "from"> {
	if (typeof from === "function") {
		return {} as any;
	} else {
		return from as any;
	}
}

/**
 * Get the decoding function from a type or a function
 */
export function fromFn<A, B>(t: FromFn<A, B> | From<A, B>): FromFn<A, B> {
	if (typeof t === "function") {
		return t;
	} else {
		return t.from;
	}
}

/**
 * Extend a type: take a type and use it as a base for another type. Much like using the spread operator:
 * ```
 * const newType = { ...oldType }
 * ```
 * but composes the `from` arguments
 *
 * @param base A base type from `InputA` to `OutputA`
 * @param nextTypeOrDecodingFunction Either an entire `Type<OutputA, AnyOutput>` or just a decoding function from `OutputA` to any type
 */
export function extendType<
	BaseType extends Type<any, any>,
	NextType extends
		| Type<OutputOf<BaseType>, any>
		| FromFn<OutputOf<BaseType>, any>,
>(
	base: BaseType,
	nextTypeOrDecodingFunction: NextType,
): Omit<BaseType, "from" | "defaultValue"> &
	(NextType extends FromFn<any, any> ? unknown : Omit<NextType, "from">) &
	From<InputOf<BaseType>, OutputOf<NextType>> {
	const {
		defaultValue: _defaultValue,
		from: _from,
		...t1WithoutDefault
	} = base;
	const t2Object = typeDef(nextTypeOrDecodingFunction);
	const t2From = fromFn(nextTypeOrDecodingFunction);

	return {
		...t1WithoutDefault,
		...t2Object,
		async from(a) {
			const f1Result = await base.from(a);
			return await t2From(f1Result);
		},
	};
}

/** Contains a type definition inside */
export type HasType<T extends Type<any, any>> = {
	/** The value decoding strategy for this item */
	type: T;
};
