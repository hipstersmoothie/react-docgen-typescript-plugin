// @ts-expect-error (this is the output of the webpack build, there are no types)
import * as Tests from '../../test-output/src/main.mjs';

/** This file is to help test the actual output of webpack build
 *
 * In plugin.test.ts, we compile the `index.ts` file with our plugin and output the results to `test-output/main.mjs`
 *
 * In order to test it without module-cache, we execute this file.
 *
 * This file logs JSON data extracted, which the plugin.test.ts will parse and compare with the snapshot.
 */

console.log(
  JSON.stringify(
    Object.entries(Tests as Record<string, { displayName: string; __docgenInfo: any }>).map(([key, value]) => ({
      name: key,
      displayName: value.displayName,
      __docgenInfo: value.__docgenInfo,
    })),
    null,
    2,
  ),
);
