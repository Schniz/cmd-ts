import Summary from '~/docs/SUMMARY.md';
import React from 'react';
import { Page } from '~/components/Page';
import { Text, Columns, Column, Box } from '~/components/Design';
import { MDXProvider } from '@mdx-js/react';
import { MarkdownLink } from '~/components/MarkdownLink';

export function DocsPage(props: {
  children: React.ReactNode | React.ReactNodeArray;
}) {
  return (
    <Page title="test">
      <Columns spacing="small">
        <Column flex={1}>
          <Box padding="small">
            <Text>
              <ShowSummary />
            </Text>
          </Box>
        </Column>
        <Column flex={4} className="markdown-body">
          {props.children}
        </Column>
      </Columns>
    </Page>
  );
}

function ShowSummary() {
  return (
    <MDXProvider
      components={{
        h1: () => null,
        li: props => <li {...props} className="list-item" />,
        ul: props => <ul {...props} className="ul" />,
        a: props => {
          const newHref = props.href.replace(/^\.\//, '/docs/');
          return <MarkdownLink {...props} href={newHref} />;
        },
      }}
    >
      <Summary />
      <style jsx>{`
        .list-item {
          list-style: none;
        }

        .list-item::before {
          content: '- ';
          opacity: 0.5;
        }

        .ul:not(:first-child) {
          margin-left: 1em;
        }

        :global([id] > a) {
          vertical-align: middle;
          opacity: 0.3;
        }

        :global([id]:hover > a) {
          opacity: 1;
        }
      `}</style>
    </MDXProvider>
  );
}
