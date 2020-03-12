import * as React from 'react';
import Ansi from 'ansi-to-react';

export function Terminal(props: { children: string }) {
  return (
    <>
      <div className="terminal">
        <Ansi useClasses className="code">
          {props.children}
        </Ansi>
      </div>
      <style jsx>{`
        .terminal :global(.code) {
          font-size: 1em;
          white-space: pre;
          border-radius: 1em;
        }

        .terminal {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;

          max-width: 800px;
          margin-top: 3rem;
        }

        .terminal :global(code) {
          display: inline-block;
          background-color: #333;
          color: #f7f7f7;
          padding: 1em;
        }

        .terminal :global(code .ansi-blue-fg) {
          color: #cae3ff;
        }

        .terminal :global(code .ansi-dim) {
          opacity: 0.6;
        }
        .terminal :global(code .ansi-red-fg) {
          color: #f74444;
        }
        .terminal :global(code .ansi-yellow-fg) {
          color: #f7d044;
        }

        .terminal :global(code .ansi-bold) {
          font-weight: bold;
        }
      `}</style>
    </>
  );
}
