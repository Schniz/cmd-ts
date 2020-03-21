import { GetStaticProps, GetStaticPaths } from 'next';
import { MDXProvider } from '@mdx-js/react';
import { MarkdownLink } from '~/components/MarkdownLink';
import { DocsPage } from '~/components/DocsPage';

function loadPage(page: string) {
  const pageContext = require.context('~/docs', true, /\.md$/, 'sync');
  return pageContext(`./${page}.md`).default;
}

function MarkdownPage(props: { page: string }) {
  const Page = loadPage(props.page);
  return (
    <DocsPage>
      <MDXProvider components={{ a: MarkdownLink }}>
        <Page />
      </MDXProvider>
    </DocsPage>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const docsDir = require.context('~/docs', true, /\.md$/, 'lazy');
  const paths = docsDir
    .keys()
    .filter(path => {
      return !path.includes('SUMMARY.md');
    })
    .map(path => {
      const page = path
        .replace(/\.md$/, '')
        .split('/')
        .slice(1);
      return { params: { page } };
    });
  return { paths: [...paths], fallback: false };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const page =
    (Array.isArray(params?.page) ? params?.page.join("/") : params?.page) ??
    'introduction';
  return { props: { page } };
};

export default MarkdownPage;
