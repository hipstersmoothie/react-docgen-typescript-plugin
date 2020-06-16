<div align="center">
  <img  height="200"
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/512px-React-icon.svg.png">
  <h1>react-docgen-typescript-plugin</h1>
  <p>A webpack plugin to inject react typescript docgen information</p>
</div>

## Install

```sh
npm install --save-dev react-docgen-typescript-plugin
# or
yarn add -D react-docgen-typescript-plugin
```

## Usage

> NOTE: The TypeScript compiler options `allowSyntheticDefaultImports` and `esModuleInterop` will make
> `react-docgen-typescript-plugin` a lot harder! Turn them off for faster build times.

```ts
const ts = require('typescript');
const ReactDocgenTypescriptPlugin = require("react-docgen-typescript-plugin").default;

module.exports = {
  plugins: [
    // Will default to loading your root tsconfig.json
    new ReactDocgenTypescriptPlugin(),
    // or with a specific tsconfig
    new ReactDocgenTypescriptPlugin({ tsconfigPath: "./tsconfig.dev.json" }),
    // or with compiler options
    new ReactDocgenTypescriptPlugin({ compilerOptions: { jsx: ts.JsxEmit.Preserve } }),
  ],
};
```

### Options

This plugins support all parser options from [react-docgen-typescript](https://github.com/styleguidist/react-docgen-typescript#parseroptions) and all of the following options

| Option               | Type           | Description                                                                                                                                         | Default                   |
| -------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| tsconfigPath         | string         | Specify the location of the `tsconfig.json` to use.                                                                                                 | `null`                    |
| compilerOptions      | object         | Specify compiler options. Cannot be used with `tsconfigPath`                                                                                        | `null`                    |
| docgenCollectionName | string or null | Specify the docgen collection name to use. All docgen information will be collected into this global object. Set to `null` to disable.              | `STORYBOOK_REACT_CLASSES` |
| setDisplayName       | boolean        | Set the components' display name. If you want to set display names yourself or are using another plugin to do this, you should disable this option. | `true`                    |
| typePropName         | string         | Specify the name of the property for docgen info prop type.                                                                                         | `type`                    |
| exclude              | glob[]         | Glob patterns to ignore and not generate docgen information for. (Great for ignoring large icon libraries)                                          | `[]`                        |
| include              | glob[]         | Glob patterns to generate docgen information for                                                                                                    | `['**/**.tsx']`             |

## Debugging

If you want to see how this plugins is including and excluding modules set the `DEBUG` environment variable.

- `DEBUG=docgen:*` - All logs
- `DEBUG=docgen:include` - Included modules
- `DEBUG=docgen:exclude` - Excluded modules

```bash
DEBUG=docgen:* npm run storybook
```

## Prior Art

- [sn-client](https://github.com/SenseNet/sn-client/) - Inspired by this custom webpack plugin
- [react-docgen-typescript-loader](https://github.com/strothj/react-docgen-typescript-loader/) - Webpack loader to generate docgen information from Typescript React components.
