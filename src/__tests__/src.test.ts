import { exec, execSync } from 'node:child_process';

import { expect, test } from 'vitest';

import { ReactDocgenTypeScriptPlugin } from '..';
// make vitest watch the file
import '../loader';
import { compile } from './test-helpers';

test('source', async () => {
  // The plugin sets a loader, which must reference a file, that must be regular (commonjs) JS (not Typescript)
  // So we need to build the plugin first, and then run the test
  execSync('npm run build');
  await compile(new ReactDocgenTypeScriptPlugin(), 'src');

  const process = exec('node --experimental-strip-types src/__tests__/check-src.ts');

  const out = await new Promise<string>((resolve) => {
    let data = '';
    process.stdout?.on('data', (d) => {
      data += d?.toString() ?? '';
    });
    process.stdout?.on('end', () => {
      resolve(data);
    });
  });

  expect(JSON.parse(out)).toMatchSnapshot();
}, 9000);
