const path = require('path');
const ReactDocgenTypescriptPlugin = require('./dist/index').default

module.exports = {
    mode: 'production',
    devtool: false,
    entry: {
        DefaultPropValue: './src/__tests__/__fixtures__/DefaultPropValue.tsx',
        HyphenatedPropName: './src/__tests__/__fixtures__/HyphenatedPropName.tsx',
        MultilineDescription: './src/__tests__/__fixtures__/MultilineDescription.tsx',
        MultilinePropDescription: './src/__tests__/__fixtures__/MultilinePropDescription.tsx',
        MultiProps: './src/__tests__/__fixtures__/MultiProps.tsx',
        Simple: './src/__tests__/__fixtures__/Simple.tsx',
        DefaultPropValue: './src/__tests__/__fixtures__/DefaultPropValue.tsx',
        TextOnlyComponent: './src/__tests__/__fixtures__/TextOnlyComponent.tsx',
    },
    output: {
        clean: true,
        path: path.resolve(__dirname, 'dist-webpack'),
    },
    resolve: {
        extensions: [".tsx", ".js"]
    },
    target: ['web', 'es2020'],
    module: {
        rules: [
          {
            test: /\.tsx?$/,
            loader: "ts-loader",
            options: {
                transpileOnly: true
            }
            }
        ]
    },
    plugins: [
        new ReactDocgenTypescriptPlugin(),
    ],
    optimization: {
        runtimeChunk: {
            name: 'runtime',
        },
        minimize: false,
        usedExports: false,
    },
    externals: {
        react: true,
        tslib: true,
      },
}