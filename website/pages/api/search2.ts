import { NextApiRequest, NextApiResponse } from 'next';
import { readDocFile } from '~/src/readDocFile'
import { highlight, Highlighted } from '~/src/highlightText';
import lunr from 'lunr';

export type SearchRecord = {
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
  score: number;
  pathAs?: string;
}[];

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const query = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
  if (typeof query !== 'string') {
    return res.status(400).json({ error: 'missing query' });
  }

  const docs = await getDocs();

  const index = lunr(function() {
    this.ref('path');
    this.field('body');
    this.field('title', { boost: 100 });

    for (const doc of Object.values(docs)) {
      this.add(doc);
    }
  });
  const results = index.query(x => {
    x.term(query, {
      boost: 100,
      wildcard: lunr.Query.wildcard.NONE
    })
    x.term(query, {
      boost: 1,
      wildcard: lunr.Query.wildcard.LEADING | lunr.Query.wildcard.TRAILING,
    })
  });
  const highlightedResults: SearchOutput = results
    .map(searchResult => {
      return { searchResult, item: docs[searchResult.ref] };
    })
    .map(({ item, searchResult }) => {
      return {
        title: highlight(item.title, query),
        body: highlight(item.body, query, 15),
        path: item.path,
        score: searchResult.score,
      };
    });
  res.status(200).json(highlightedResults);
};

async function getDocs(): Promise<Record<string, SearchRecord>> {
  const context = require.context('~/docs', true, /\.mdx?$/, 'lazy');
  const results: Record<string, SearchRecord> = {};
  for (const key of context.keys()) {
    if (key === './SUMMARY.md') continue;
    const file = key.replace(/^\.\//, '');
    const { body, title } = await readDocFile(file, { strip: true });
    const obj: SearchRecord = {
      body,
      title,
      path: `/docs/${file.replace(/\.mdx?$/, '')}`,
      tag: 'Documentation',
      pathAs: `/docs/[...page]`,
    };
    results[obj.path] = obj;
  }
  return results;
}
