import { AppProps } from 'next/app';
import 'github-markdown-css/github-markdown.css';
import 'highlight.js/styles/github.css';

export default (props: AppProps) => {
  return (
    <>
      <props.Component {...props.pageProps} />
      <style jsx>{`
        :global(body, h1, h2, h3, h4, ol, ul, li) {
          margin: 0;
          padding: 0;
        }
      `}</style>
    </>
  );
};
