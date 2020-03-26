import { NextApiRequest, NextApiResponse } from 'next';
import removeMd from 'remove-markdown';
import flatMap from 'lodash/flatMap';
import * as highlightWords from 'highlight-words-core';
import FlexSearch, { Index } from 'flexsearch';

export type SearchRecord = {
  id: number;
  body: string;
  title: string;
  tag: string;
  path: string;
  pathAs?: string;
};

export type SearchOutput = {
  title: Highlighted[];
  body: Highlighted[];
  path: string;
  pathAs?: string;
}[];

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const query = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
  if (typeof query !== 'string') {
    return res.status(400).json({ error: 'missing query' });
  }
  const data: SearchRecord[] = [];
  const searchIndex = FlexSearch.create<SearchRecord>({
    doc: {
      id: 'id',
      field: ['body', 'path', 'title', 'tag'],
    },
  });
  await addDocs(searchIndex, data);
  const results = await searchIndex.search({
    query,
    suggest: true,
  });
  const highlightedResults: SearchOutput = results.map(result => {
    return {
      title: highlighted(result.title, query),
      body: highlighted(result.body, query, 15),
      path: result.path,
      pathAs: result.pathAs,
    };
  });
  res.status(200).json(highlightedResults);
};

async function addDocs(flex: Index<SearchRecord>, data: SearchRecord[]) {
  const context = require.context('~/docs', true, /\.mdx?$/, 'lazy');
  for (const key of context.keys()) {
    if (key === './SUMMARY.md') continue;
    const file = key.replace(/^\.\//, '');
    const { body, title } = await readMd(file);
    const id = data.length;
    const obj: SearchRecord = {
      id,
      body,
      title,
      path: `/docs/${file.replace(/\.mdx?$/, '')}`,
      pathAs: `/docs/[...page]`,
      tag: 'Documentation',
    };
    data.push(obj);
    flex.add(obj);
  }
}

async function readMd(file: string): Promise<{ body: string; title: string }> {
  const { default: markdown } = await import(`!raw-loader!~/docs/${file}`);
  const body: string = markdown;
  const lines = body.split('\n');
  const titleIndex = lines.findIndex(x => x.startsWith('# '));
  const titleLine = titleIndex > -1 ? lines[titleIndex] : undefined;
  const title = titleLine?.replace(/^# /, '') ?? 'Untitled';
  lines.splice(titleIndex, 1);
  return { body: removeMd(lines.join('\n')), title: removeMd(title) };
}

type Highlighted = { text: string; highlighted: boolean };

function highlighted(
  text: string,
  query: string,
  padding?: number
): Highlighted[] {
  const result = highlightWords
    .findAll({
      searchWords: query.split(/\s+/),
      textToHighlight: text,
    })
    .map(indices => {
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
