import type { FC, PropsWithChildren } from 'react';

interface HyphenatedPropNameProps {
  /** Button color. */
  'button-color': 'blue' | 'green';
}

/**
 * A component with a hyphenated prop name.
 */
export const HyphenatedPropNameComponent: FC<PropsWithChildren<HyphenatedPropNameProps>> = (props) => (
  <button style={{ backgroundColor: props['button-color'] }}>{props.children}</button>
);
