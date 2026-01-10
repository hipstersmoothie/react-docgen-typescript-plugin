import type { FC, PropsWithChildren } from 'react';

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
const DefaultPropValueComponentImpl: FC<PropsWithChildren<DefaultPropValueComponentProps>> = (props) => (
  <button disabled={props.disabled} style={{ backgroundColor: props.color }}>
    {props.counter}
    {props.children}
  </button>
);

export const DefaultPropValueComponent = DefaultPropValueComponentImpl as typeof DefaultPropValueComponentImpl & {
  defaultProps: Partial<DefaultPropValueComponentProps>;
};

DefaultPropValueComponent.defaultProps = {
  counter: 123,
  disabled: false,
  tabIndex: -1,
};
