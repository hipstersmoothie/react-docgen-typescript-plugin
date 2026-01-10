import { exec, execSync } from 'node:child_process';
import { createRequire } from 'node:module';

import { expect, test } from 'vitest';

import '../index';
import '../loader';
import { compile } from './test-helpers';

const require = createRequire(import.meta.url);

test('dist', async () => {
  execSync('npm run build');

  const location = import.meta.dirname + '/../../dist/index.js';
  const { ReactDocgenTypeScriptPlugin } = require(location);

  await compile(new ReactDocgenTypeScriptPlugin(), 'dist');

  const process = exec('node --experimental-strip-types src/__tests__/check-dist.ts');

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
