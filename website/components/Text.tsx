import React from 'react';
import cx from 'classnames';

export type Variant = 'code';
export type Size = 'heading';

export function Text(props: {
  variant?: Size;
  style?: Variant;
  children: React.ReactNode;
}) {
  const className = props.style === 'code' ? 'code' : 'normal';
  const Tag = props.variant === 'heading' ? 'h1' : 'span';
  return (
    <>
      <Tag
        className={cx({
          code: props.style === 'code',
          heading: props.variant === 'heading',
          normal: !props.style,
        })}
      >
        {props.children}
      </Tag>
      <style jsx>{`
        .heading {
          font-size: 2em;
        }

        .normal {
          font-family: Arial;
        }
        .code {
          font-family: Menlo, Monaco, Lucida Console, Liberation Mono,
            DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace;
        }
      `}</style>
    </>
  );
}
