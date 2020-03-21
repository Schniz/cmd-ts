import React from 'react';
import cx from 'classnames';

export type Variant = 'code';
export type Size = 'heading';

const aligns = {
  left: 'left',
  right: 'right',
  center: 'center',
};

export function Text(props: {
  variant?: Size;
  style?: Variant;
  children: React.ReactNode;
  align?: keyof typeof aligns;
  className?: string;
}) {
  const Tag = props.variant === 'heading' ? 'h1' : 'div';
  return (
    <>
      <Tag
        className={cx(props.className, {
          code: props.style === 'code',
          heading: props.variant === 'heading',
          normal: !props.style,
        })}
        style={{
          textAlign: props.align,
        }}
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
