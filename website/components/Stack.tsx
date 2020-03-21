import { Size } from './options';
import { Box } from './Box';
import React from 'react';

export function Stack(props: {
  spacing: Size;
  children: React.ReactNode | React.ReactNodeArray;
}) {
  const numberOfComponents = React.Children.count(props.children);
  const components = React.Children.map(props.children, (child, index) => {
    const padding: Size =
      numberOfComponents === index + 1 ? 'none' : props.spacing;
    return (
      <Box key={index} paddingBottom={padding}>
        {child}
      </Box>
    );
  });

  return <>{components}</>;
}
