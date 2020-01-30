import minimist from 'minimist';
import { either, Either } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { normalizeMinimist, NormalizedMinimist } from './normalMinimist';
import { ParseError, Parser } from './Parser';
import { assign } from './assign';
import { ParsingContext } from './ParsingContext';
import { FromStr, FromStrArray, INTERNAL_CLI_ARGS_NAME } from './utils';
import { BoolOfStr } from './BoolOfStr';
import { tupleWithOneElement } from './tupleWithOneElement';

type OutputOfNamedArguments<CBO extends CommandBuilderOptions> = [
  t.TypeOf<CBO['namedArguments']>, // arguments
  string[] // positional
];

interface CommandBuilderOptions {
  name?: string;
  version?: string;
  defaultValues: Record<string, any>;
  namedArgumentsNames: Record<string, true>;
  namedArguments: t.Type<any>;
}

class CommandBuilder<
  Options extends CommandBuilderOptions = {
    name: string;
    version: string;
    namedArguments: t.Type<unknown>;
    namedArgumentsNames: Record<string, true>;
    defaultValues: Record<string, {}>;
  }
> implements Parser<OutputOfNamedArguments<Options>> {
  readonly options: Options;

  static empty = (name?: string, version?: string) =>
    new CommandBuilder({
      name,
      version,
      namedArguments: t.unknown,
      namedArgumentsNames: {},
      defaultValues: {},
    });

  constructor(options: Options) {
    this.options = options;
  }

  multiNamedArg<Name extends string, Type extends FromStrArray>(opts: {
    name: Name;
    type: Type;
    defaultValue?: string[];
  }) {
    return this.setNamedArg(opts);
  }

  private setNamedArg<Name extends string, Type extends FromStrArray>(opts: {
    name: Name;
    type: Type;
    defaultValue?: string[];
  }) {
    const type = t.type(
      { [opts.name]: opts.type } as { [key in Name]: Type },
      INTERNAL_CLI_ARGS_NAME
    );
    const intersection: t.IntersectionC<[
      Options['namedArguments'],
      typeof type
    ]> = t.intersection(
      [this.options.namedArguments, type],
      INTERNAL_CLI_ARGS_NAME
    );
    const namedArgumentsNames = {
      ...this.options.namedArgumentsNames,
      [opts.name]: true,
    };
    const defaultValues = opts.defaultValue
      ? assign(this.options.defaultValues, opts.name, opts.defaultValue)
      : this.options.defaultValues;
    return new CommandBuilder(
      assign(
        assign(
          { ...this.options, namedArgumentsNames },
          'namedArguments',
          intersection
        ),
        'defaultValues',
        defaultValues
      )
    );
  }

  namedArg<Name extends string, Type extends FromStr>(opts: {
    name: Name;
    type: Type;
    defaultValue?: string;
  }) {
    const type = tupleWithOneElement(opts.type);
    return this.multiNamedArg({
      name: opts.name,
      type,
      defaultValue: opts.defaultValue ? [opts.defaultValue] : undefined,
    });
  }

  type() {
    const mmst = t.type({
      positional: t.array(t.string),
      named: this.options.namedArguments,
    });
    return new t.Type<
      OutputOfNamedArguments<Options>,
      NormalizedMinimist,
      unknown
    >(
      INTERNAL_CLI_ARGS_NAME,
      (_x): _x is OutputOfNamedArguments<Options> => true,
      (obj, ctx) => {
        return either.map(mmst.validate(obj, ctx), x => {
          return [x.named, x.positional];
        });
      },
      _x => {
        throw new Error('irreversible');
      }
    );
  }

  boolArg<Name extends string>(opts: { name: Name; defaultValue?: boolean }) {
    return this.namedArg({
      name: opts.name,
      defaultValue: opts.defaultValue ? String(opts.defaultValue) : 'false',
      type: BoolOfStr,
    });
  }

  parse(
    providedArgs: NormalizedMinimist,
    context: ParsingContext = new ParsingContext()
  ): Either<ParseError, OutputOfNamedArguments<Options>> {
    const args = assign(providedArgs, 'named', {
      ...this.options.defaultValues,
      ...providedArgs.named,
    });

    for (const argument of Object.keys(args.named)) {
      if (argument in this.options.namedArgumentsNames) {
        context.relevantNamedArguments.add(argument);
      }
    }

    return either.mapLeft(
      either.map(this.options.namedArguments.decode(args.named), named => {
        return [named, args.positional];
      }),
      validationErrors => {
        return { validationErrors, parsed: args, context };
      }
    );
  }

  parseArray(argv: string[]) {
    const providedArgs = normalizeMinimist(minimist(argv));
    return this.parse(providedArgs);
  }
}

export function program(name?: string, version?: string) {
  return CommandBuilder.empty(name, version);
}
