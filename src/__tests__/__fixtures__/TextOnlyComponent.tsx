import type { FC } from 'react';

/**
 * A component with only text content wrapped in a div.
 *
 * Ref: https://github.com/strothj/react-docgen-typescript-loader/issues/7
 */
export const SimpleComponent: FC<{}> = () => <div>Test only component</div>;
