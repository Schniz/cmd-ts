import { Size } from './options';
import React from 'react';
import { Box } from './Box';

export function Column(props: {
  spacing?: Size;
  flex: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Box
      paddingRight={props.spacing ?? 'none'}
      flex={props.flex}
      className={props.className}
    >
      {props.children}
    </Box>
  );
}

export function Columns(props: {
  spacing: Size;
  children: React.ReactElement[] | React.ReactElement;
}) {
  const numberOfComponents = React.Children.count(props.children);
  const components = React.Children.map(props.children, (child, index) => {
    return React.cloneElement(child, {
      spacing: numberOfComponents === index + 1 ? 'none' : props.spacing,
    });
  });
  return <div style={{ display: 'flex' }}>{components}</div>;
}
