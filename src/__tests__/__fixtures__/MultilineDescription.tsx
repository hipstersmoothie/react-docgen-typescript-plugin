import type { FC, PropsWithChildren } from 'react';

interface MultilineDescriptionProps {
  /** Button color. */
  color: 'blue' | 'green';
}

/**
 * A component with a multiline description.
 *
 * Second line.
 */
export const MultilineDescriptionComponent: FC<PropsWithChildren<MultilineDescriptionProps>> = (props) => (
  <button style={{ backgroundColor: props.color }}>{props.children}</button>
);
