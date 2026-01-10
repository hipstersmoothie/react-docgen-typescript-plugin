import type { FC, PropsWithChildren } from 'react';

interface MultilinePropDescriptionComponentProps {
  /**
   * This is a multiline prop description.
   *
   * Second line.
   */
  color: 'blue' | 'green';
}

/**
 * A component with multiline prop description.
 */
export const MultilinePropDescriptionComponent: FC<PropsWithChildren<MultilinePropDescriptionComponentProps>> = (
  props,
) => <button style={{ backgroundColor: props.color }}>{props.children}</button>;
