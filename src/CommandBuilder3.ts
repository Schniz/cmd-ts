// import * as t from 'io-ts';
// import { tupleWithOneElement } from './tupleWithOneElement';
// import { IntOfStr } from './example/test-types';
// import { either, Either, Right } from 'fp-ts/lib/Either';
// import { minimist } from './minimist';

// type FromStrArray<T extends any = any> = t.Type<T, string[], unknown>;
// type FromStr<T extends any = any> = t.Type<T, string, unknown>;

// type NamedArg<T extends FromStrArray = FromStrArray> = {
//   long: string;
//   short?: string;
//   type: T;
//   description: string;
//   env?: string;
// };

// function getTypes<T extends Record<string, NamedArg>>(
//   t: T
// ): { [key in keyof T]: T[key]['type'] } {
//   const x = {} as { [key in keyof T]: T[key]['type'] };

//   for (const [key, value] of Object.entries(t)) {
//     x[key as keyof T] = value.type;
//   }

//   return x;
// }

// type PositionalArg<T extends FromStr = FromStr> = {
//   type: T;
//   description?: string;
//   name: string;
// };

// type ParseError<TR extends TypeRecord> = {
//   positionalConfig: t.TupleType<PositionalArg[]>;
//   positionalErrors: t.Errors;
//   namedArgsErrors: TRErrors<TR>;
//   namedArgsConfig: Record<string, NamedArg>;
//   minimist: MinimistResult;
// };

// function combineValidation<E1, O1, E2, O2>(
//   e1: Either<E1, O1>,
//   e2: Either<E2, O2>,
//   defaultE1: E1,
//   defaultE2: E2
// ): Either<[E1, E2], [O1, O2]> {
//   if (e1._tag === 'Left' && e2._tag === 'Left') {
//     return either.throwError([e1.left, e2.left]);
//   } else if (e1._tag === 'Left') {
//     return either.throwError([e1.left, defaultE2]);
//   } else if (e2._tag === 'Left') {
//     return either.throwError([defaultE1, e2.left]);
//   } else {
//     return either.of([e1.right, e2.right]);
//   }
// }

// function command<
//   NamedArgs extends Record<string, NamedArg>,
//   Positional extends PositionalArg[]
// >(named: NamedArgs, ...positional: Positional) {
//   const typesOfNamed = getTypes(named);
//   const decodeNamedArgs = composedType(typesOfNamed);

//   const positionalType = positionalArgType(positionals);

//   function parse(
//     args: MinimistResult
//   ): Either<
//     ParseError<typeof typesOfNamed>,
//     [TROutput<typeof typesOfNamed>, t.TypeOf<Positional>]
//   > {
//     const parsedNamed = decodeNamedArgs(args.named);
//     const parsedPositional = positional.decode(args.positional);
//     // const parsedPositional = positional.decode(args.positional);

//     const combinedValidation = combineValidation(
//       parsedNamed,
//       parsedPositional,
//       emptyError(typesOfNamed),
//       []
//     );

//     return either.mapLeft(
//       combinedValidation,
//       ([namedArgsErrors, positionalErrors]) => {
//         return {
//           namedArgsErrors,
//           positionalErrors,
//           positionalConfig: positional,
//           minimist: args,
//           namedArgsConfig: named,
//         };
//       }
//     );
//   }

//   //   function help() {
//   //     for (const [key, { description, type }] of Object.entries(named)) {
//   //       console.log(`--${kebabCase(key)} <${type.name}> - ${description}`);
//   //     }

//   //     for (const pos of positional.types) {
//   //       console.log(`<${pos.name}> - ${pos.description}`);
//   //     }
//   //   }

//   function parseArr(argv: string[]) {
//     let long: Record<string, string> = {};
//     let short: Record<string, string> = {};

//     for (const [key, value] of Object.entries(named)) {
//       long[value.long] = key;
//       if (value.short) {
//         short[value.short] = key;
//       }
//     }

//     const mmst = minimist(argv, {
//       short,
//       long,
//       forceBoolean: new Set(),
//       positionalNames: positional.map(x => x.name),
//     });
//     return parse(mmst);
//   }

//   return {
//     parse,
//     // help,
//     parseArr,
//   };
// }

// function prettyPrintErrors(
//   e: Either<ParseError, any>
// ): asserts e is Right<any> {
//   if (e._tag === 'Right') return;

//   const { namedArgsErrors, positionalErrors, parsed } = e.left;
//   const errorMessagesForNamed: Record<string, string[]> = {};
//   const errorMessagesForPositional: Record<string, string[]> = {};

//   for (const error of namedArgsErrors) {
//     const ctx = error.context.filter(
//       x => x.type.name !== INTERNAL_CLI_ARGS_NAME
//     );
//     const prop = ctx[0];
//     errorMessagesForNamed[prop.key] = (
//       errorMessagesForNamed[prop.key] ?? []
//     ).concat([error.message ?? 'No message provided']);
//   }

//   for (const error of positionalErrors) {
//     const ctx = error.context.filter(
//       x => x.type.name !== INTERNAL_CLI_ARGS_NAME
//     );
//     const prop = ctx[0];
//     errorMessagesForPositional[prop.key] = (
//       errorMessagesForPositional[prop.key] ?? []
//     ).concat([error.message ?? 'No message provided']);
//   }

//   for (const parsedItem of parsed.context) {
//     switch (parsedItem.type) {
//       case 'positional': {
//         const errorMessage =
//           errorMessagesForPositional[parsedItem.position] ?? [];
//         if (errorMessage.length === 0) {
//           console.error(chalk.green(parsedItem.input));
//         } else {
//           console.error(
//             chalk.red.bold(parsedItem.input) + ' ' + chalk.red(errorMessage)
//           );
//           delete errorMessagesForPositional[parsedItem.position];
//         }
//         break;
//       }
//       case 'forcePositional': {
//         console.error(chalk.dim('--'));
//         break;
//       }
//       case 'namedArgument': {
//         const inputValue = parsedItem.inputValue
//           ? chalk.bold(parsedItem.inputValue)
//           : '';
//         const together = `${parsedItem.inputKey} ${inputValue}`.trim();
//         const errorMessage = errorMessagesForNamed[parsedItem.key] ?? [];
//         if (errorMessage.length === 0) {
//           console.error(chalk.green(together));
//         } else {
//           console.error(
//             chalk.red.italic(together) + ' ' + chalk.red(errorMessage)
//           );
//           delete errorMessagesForNamed[parsedItem.key];
//         }
//         break;
//       }
//       case 'missingPositional': {
//         console.error(chalk.red(`<${parsedItem.name}: missing>`));
//       }
//     }
//   }

//   const leftoverNamedErrors = Object.entries(errorMessagesForNamed);
//   if (leftoverNamedErrors.length > 0) {
//     console.error(chalk.red(`The following named arguments were missing:`));
//     for (const [key, value] of leftoverNamedErrors) {
//       console.error(chalk.red(`  ${key} ${value}`));
//     }
//   }

//   process.exit(1);
// }

// const cmd = command(
//   {
//     hello: {
//       long: 'hello',
//       description: 'Hello world!',
//       type: tupleWithOneElement(t.string),
//     },
//     numbers: {
//       long: 'number',
//       short: 'n',
//       description: 'Hello world!',
//       type: t.array(IntOfStr),
//     },
//   }
//   // pos({ type: t.string, name: 'name' }),
//   // pos({ type: IntOfStr, name: 'age' }),
// );

// const y = cmd.parseArr(process.argv.slice(2));
// // import { ThrowReporter } from 'io-ts/lib/ThrowReporter';
// import { INTERNAL_CLI_ARGS_NAME } from './utils';
// import { MinimistResult } from './minimist';
// import chalk from 'chalk';
// import {
//   composedType,
//   TRErrors,
//   TROutput,
//   TypeRecord,
//   emptyError,
// } from './composedType';
// import {positionalArgType} from './positionalArgType';
// // ThrowReporter.report(y);
// prettyPrintErrors(y);
// console.log(y.right);
