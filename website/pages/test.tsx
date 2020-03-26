import React, { useState } from 'react';
import Link from 'next/link';
import fetch from 'isomorphic-unfetch';
import useSWR from 'swr';
import { SearchOutput } from '~/pages/api/search2';
import { Page } from '~/components/Page';

async function search(query: string): Promise<SearchOutput> {
  if (query.length === 0) {
    return [];
  }

  const response = await fetch(`/api/search2?q=${encodeURIComponent(query)}`);
  if (response.status === 200) {
    return response.json();
  } else {
    throw new Error('Error in response');
  }
};

export default () => {
  const [query, setQuery] = useState('');
  const result = useSWR(query.trim(), search);
  const data = result.data;
  return (
    <Page title="search">
      <div>
        <input
          placeholder="Search..."
          type="search"
          value={query}
          onChange={v => setQuery(v.target.value)}
        />
        {data &&
          data.map(item => {
            return (
              <React.Fragment key={item.path}>
                <h1>
                  <Link as={item.pathAs} href={item.path}>
                    <a>
                      {item.title.map((x, i) =>
                        x.highlighted ? <mark key={i}>{x.text}</mark> : x.text
                      )}
                    </a>
                  </Link>
                </h1>
                <p>
                  {item.body.map((x, i) =>
                    x.highlighted ? <mark key={i}>{x.text}</mark> : x.text
                  )}
                </p>
              </React.Fragment>
            );
          })}
      </div>
    </Page>
  );
};
