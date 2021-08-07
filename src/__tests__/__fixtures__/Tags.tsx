import * as React from "react";

interface ComponentWithTaggedProps {
  /**
   * Button color.
   *
   * @hidden always
   */
  color: "blue" | "green";
}

/**
 * A component with tags.
 *
 * @since now
 */
export const TaggedComponent: React.FC<ComponentWithTaggedProps> = (props) => (
  <button style={{ backgroundColor: props.color }}>{props.children}</button>
);
