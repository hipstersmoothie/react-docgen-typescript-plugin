import type { PropsWithChildren } from 'react';

interface DefaultPropValueComponentProps {
  /**
   * Button color.
   *
   * @default blue
   **/
  color: 'blue' | 'green';

  /**
   * Button counter.
   */
  counter: number;

  /**
   * Button disabled.
   */
  disabled: boolean;

  tabIndex: number;
}

/**
 * Component with a prop with a default value.
 */
export default (props: PropsWithChildren<DefaultPropValueComponentProps>) => {
  return (
    <button disabled={props.disabled} style={{ backgroundColor: props.color }}>
      {props.counter}
      {props.children}
    </button>
  );
};
