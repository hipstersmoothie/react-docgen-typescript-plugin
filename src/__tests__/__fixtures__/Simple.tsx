import type { FC, PropsWithChildren } from 'react';

interface SimpleComponentProps {
  /** Button color. */
  color: 'blue' | 'green';
}

/**
 * A simple component.
 */
export const SimpleComponent: FC<PropsWithChildren<SimpleComponentProps>> = (props) => (
  <button style={{ backgroundColor: props.color }}>{props.children}</button>
);
