import type { AppProps } from 'next/app';
import 'nextra-theme-docs/style.css';

export default function Nextra({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <style jsx global>{`
        pre,
        code {
          background-color: rgb(243, 244, 246);
        }

        :root {
          --shiki-color-text: #333;
          --shiki-color-background: #f4f4f4;
          --shiki-token-constant: #ff4000;
          --shiki-token-string: #19af07;
          --shiki-token-comment: #857f7f;
          --shiki-token-keyword: #d88011;
          --shiki-token-parameter: #ffb86c;
          --shiki-token-function: #5f87d7;
          --shiki-token-string-expression: #19af07;
          --shiki-token-punctuation: #ff7979;
          --shiki-token-link: #86c1b9;
        }

        pre[data-shiki] {
          font-family: Fira Code, ui-monospace, SFMono-Regular, Menlo, Monaco,
            Consolas, 'Liberation Mono', 'Courier New', monospace !important;
        }

        .dark {
          --shiki-color-text: #f8f8f8;
          --shiki-token-constant: #ff875f;
          --shiki-token-string: #62ce55;
          --shiki-token-comment: #958f8f;
          --shiki-token-keyword: #ffd75f;
          --shiki-token-parameter: #ffb86c;
          --shiki-token-function: #5f87d7;
          --shiki-token-string-expression: #62ce55;
          --shiki-token-punctuation: #ff7979;
          --shiki-token-link: #86c1b9;
        }
      `}</style>
    </>
  );
}
