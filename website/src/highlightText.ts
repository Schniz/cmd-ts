export type Highlighted = { text: string; highlighted: boolean };
import flatMap from 'lodash/flatMap';
import { findAll } from 'highlight-words-core';

export function highlight(
  text: string,
  query: string,
  padding?: number
): Highlighted[] {
  const result = findAll({
    searchWords: query.split(/\s+/),
    textToHighlight: text,
  }).map(indices => {
    return {
      text: text.slice(indices.start, indices.end),
      highlighted: indices.highlight,
    };
  });

  const shorterResults = flatMap(result, (t, index, arr) => {
    if (!padding) return [t];
    if (t.highlighted) {
      return [t];
    }

    const results: Highlighted[] = [];

    if (
      arr[index - 1]?.highlighted &&
      arr[index + 1]?.highlighted &&
      t.text.length < padding + 6
    ) {
      results.push(t);
    } else if (arr[index - 1]?.highlighted) {
      let text =
        padding > t.text.length ? t.text : t.text.slice(0, padding) + '...';
      results.push({
        text,
        highlighted: false,
      });
    } else if (arr[index + 1]?.highlighted) {
      let text =
        padding > t.text.length
          ? t.text
          : '...' + t.text.slice(t.text.length - padding);
      results.push({
        text,
        highlighted: false,
      });
    }

    return results;
  });

  if (shorterResults.length === 0) {
    return [{ text: text.slice(0, (padding ?? 25) * 4), highlighted: false }];
  }

  return shorterResults;
}
