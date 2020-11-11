import { Token } from './tokenizer';
import createDebugger from 'debug';

const debug = createDebugger('cmd-ts:parser');

export type AstNode =
  | Value
  | LongOption
  | ShortOption
  | ShortOptions
  | PositionalArgument
  | ForcePositional;

type BaseAstNode<Type extends string> = {
  type: Type;
  index: number;
  raw: string;
};

export interface LongOption extends BaseAstNode<'longOption'> {
  key: string;
  value?: OptionValue;
}

interface Delimiter extends BaseAstNode<'delimiter'> {}

interface Value extends BaseAstNode<'value'> {}

interface OptionValue extends BaseAstNode<'optionValue'> {
  delimiter: Delimiter;
  node: Value;
}

export interface ShortOptions extends BaseAstNode<'shortOptions'> {
  options: ShortOption[];
}

export interface ShortOption extends BaseAstNode<'shortOption'> {
  key: string;
  value?: OptionValue;
}

export interface PositionalArgument extends BaseAstNode<'positionalArgument'> {}

interface ForcePositional extends BaseAstNode<'forcePositional'> {
  type: 'forcePositional';
}

/**
 * A weird thing about command line interfaces is that they are not consistent without some context.
 * Consider the following argument list: `my-app --server start`
 *
 * Should we parse it as `[positional my-app] [option --server start]`
 * or should we parse it as `[positional my-app] [flag --server] [positional start]`?
 *
 * The answer is — it depends. A good command line utility has the context to know which key is a flag
 * and which is an option that can take a value. We aim to be a good command line utility library, so
 * we need to have the ability to provide this context.
 *
 * This is the small object that has this context.
 */
type ForceFlag = {
  /**
   * Short keys that we will force to read as flags
   */
  shortFlagKeys: Set<string>;
  /**
   * Long keys that we will force to read as flags
   */
  longFlagKeys: Set<string>;
};

/**
 * Create an AST from a token list
 *
 * @param tokens A token list, coming from `tokenizer.ts`
 * @param forceFlag Keys to force as flag. {@see ForceFlag} to read more about it.
 */
export function parse(tokens: Token[], forceFlag: ForceFlag): AstNode[] {
  if (debug.enabled) {
    debug(
      `Registered short flags: ${JSON.stringify([...forceFlag.shortFlagKeys])}`
    );
    debug(
      `Registered long flags: ${JSON.stringify([...forceFlag.longFlagKeys])}`
    );
  }

  const nodes: AstNode[] = [];
  let index = 0;
  let forcedPositional = false;

  function getToken(): Token | undefined {
    return tokens[index++];
  }

  function peekToken(): Token | undefined {
    return tokens[index];
  }

  while (index < tokens.length) {
    const currentToken = getToken();
    if (!currentToken) break;

    if (currentToken.type === 'argumentDivider') {
      continue;
    }

    if (forcedPositional) {
      let str = currentToken.raw;
      let nextToken = getToken();
      while (nextToken && nextToken?.type !== 'argumentDivider') {
        str += nextToken.raw;
        nextToken = getToken();
      }
      nodes.push({
        type: 'positionalArgument',
        index: currentToken.index,
        raw: str,
      });
      continue;
    }

    if (currentToken.type === 'char') {
      let str = currentToken.raw;
      let nextToken = getToken();
      while (nextToken && nextToken?.type !== 'argumentDivider') {
        str += nextToken.raw;
        nextToken = getToken();
      }
      nodes.push({
        type: 'positionalArgument',
        index: currentToken.index,
        raw: str,
      });
      continue;
    }

    if (currentToken.type === 'longPrefix') {
      let nextToken = getToken();

      if (nextToken?.type === 'argumentDivider') {
        nodes.push({
          type: 'forcePositional',
          index: currentToken.index,
          raw: '--',
        });
        forcedPositional = true;
        continue;
      }

      let key = '';
      while (
        nextToken &&
        nextToken?.raw !== '=' &&
        nextToken?.type !== 'argumentDivider'
      ) {
        key += nextToken.raw;
        nextToken = getToken();
      }

      const parsedValue = parseOptionValue({
        key,
        delimiterToken: nextToken,
        forceFlag: forceFlag.longFlagKeys,
        getToken,
        peekToken,
      });
      let raw = `--${key}`;

      if (parsedValue) {
        raw += parsedValue.raw;
      }

      nodes.push({
        type: 'longOption',
        key,
        index: currentToken.index,
        raw,
        value: parsedValue,
      });
      continue;
    }

    if (currentToken.type === 'shortPrefix') {
      let keys: Token[] = [];
      let nextToken = getToken();

      if (nextToken?.type === 'argumentDivider' || !nextToken) {
        nodes.push({
          type: 'positionalArgument',
          index: currentToken.index,
          raw: '-',
        });
        continue;
      }

      while (
        nextToken &&
        nextToken?.type !== 'argumentDivider' &&
        nextToken?.raw !== '='
      ) {
        keys.push(nextToken);
        nextToken = getToken();
      }

      const lastKey = keys.pop()!;
      const parsedValue = parseOptionValue({
        key: lastKey.raw,
        delimiterToken: nextToken,
        forceFlag: forceFlag.shortFlagKeys,
        getToken,
        peekToken,
      });

      const options: ShortOption[] = [];

      for (const key of keys) {
        options.push({
          type: 'shortOption',
          index: key.index,
          raw: key.raw,
          key: key.raw,
        });
      }

      let lastKeyRaw = lastKey.raw;

      if (parsedValue) {
        lastKeyRaw += parsedValue.raw;
      }

      options.push({
        type: 'shortOption',
        index: lastKey.index,
        raw: lastKeyRaw,
        value: parsedValue,
        key: lastKey.raw,
      });

      let optionsRaw = `-${keys.map((x) => x.raw).join('')}${lastKey.raw}`;
      if (parsedValue) {
        optionsRaw += parsedValue.raw;
      }

      const shortOptions: ShortOptions = {
        type: 'shortOptions',
        index: currentToken.index,
        raw: optionsRaw,
        options,
      };

      nodes.push(shortOptions);
      continue;
    }

    index++;
    continue;
  }

  if (debug.enabled) {
    const objectNodes = nodes.map((node) => ({ [node.type]: node.raw }));
    debug(`Parsed items:`, JSON.stringify(objectNodes));
  }

  return nodes;
}

function parseOptionValue(opts: {
  delimiterToken?: Token;
  getToken(): Token | undefined;
  peekToken(): Token | undefined;
  key: string;
  forceFlag: Set<string>;
}): OptionValue | undefined {
  let { getToken, delimiterToken, forceFlag, key } = opts;
  const shouldReadKeyAsFlag =
    forceFlag.has(key) || opts.peekToken()?.type !== 'char';

  if (!delimiterToken || (delimiterToken.raw !== '=' && shouldReadKeyAsFlag)) {
    return;
  }

  const delimiter = delimiterToken.raw === '=' ? '=' : ' ';
  const delimiterIndex = delimiterToken.index;

  let nextToken = getToken();
  if (!nextToken) {
    return;
  }

  let value = '';
  const valueIndex = nextToken.index;
  while (nextToken && nextToken?.type !== 'argumentDivider') {
    value += nextToken.raw;
    nextToken = getToken();
  }

  return {
    type: 'optionValue',
    index: delimiterToken.index,
    delimiter: { type: 'delimiter', raw: delimiter, index: delimiterIndex },
    node: { type: 'value', raw: value, index: valueIndex },
    raw: `${delimiter}${value}`,
  };
}
