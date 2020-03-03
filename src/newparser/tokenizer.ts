import { enumerate } from './enumerate';

export type Token =
  | { index: number; type: 'argumentDivider'; raw: ' ' }
  | {
      index: number;
      type: 'shortPrefix';
      raw: '-';
    }
  | {
      index: number;
      type: 'longPrefix';
      raw: '--';
    }
  | {
      index: number;
      type: 'char';
      raw: string;
    };


export function tokenize(strings: string[]): Token[] {
  let tokens: Token[] = [];
  let overallIndex = 0;

  const push = (token: Token) => {
    tokens.push(token);
    overallIndex += token.raw.length;
  }

  for (const [stringIndex, string] of enumerate(strings)) {
    const chars = [...string];
    for (let i = 0; i < chars.length; i++) {
      if (chars[i] === "-" && chars[i+1] === "-") {
        push({ type: 'longPrefix', raw: '--', index: overallIndex })
        i++;
      } else if (chars[i] === "-") {
        push({ type: 'shortPrefix', raw: '-', index: overallIndex })
      } else {
        push({ type: 'char', raw: chars[i], index: overallIndex })
      }
    }

    if (stringIndex + 1 !== strings.length) {
      push({ type: 'argumentDivider', raw: ' ', index: overallIndex })
    }
  }

  return tokens;
}
