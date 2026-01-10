import path from 'node:path';

import webpack from 'webpack';

import type { ReactDocgenTypeScriptPlugin } from '..';

export function compile(plugin: ReactDocgenTypeScriptPlugin, directory: string): Promise<string> {
  return new Promise((resolve, reject) => {
    webpack({
      mode: 'production',
      entry: { main: './src/__tests__/index.ts' },
      output: {
        path: path.join(process.cwd(), 'test-output', directory),
        module: true,
        libraryTarget: 'module',
      },
      experiments: {
        outputModule: true,
      },
      externals: {
        tslib: 'tslib',
        react: 'react',
        'react-dom': 'react-dom',
      },
      optimization: {
        minimize: false,
      },
      plugins: [plugin],
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
        ],
      },
    }).run((error, stats) => {
      if (error) {
        return reject(error);
      }

      if (stats?.hasErrors()) {
        return reject(stats.toString('errors-only'));
      }

      return resolve(stats?.toString() ?? '');
    });
  });
}
