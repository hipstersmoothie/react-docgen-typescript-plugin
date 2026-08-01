<div align="center">
  <img  height="200"
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/512px-React-icon.svg.png">
  <h1>react-docgen-typescript-plugin-delazyify</h1>
  <p>A webpack plugin to inject react typescript docgen information</p>
</div>

## Install

```sh
npm install --save-dev react-docgen-typescript-plugin-delazyify
# or
yarn add -D react-docgen-typescript-plugin-delazyify
```

## Usage

```ts
const ts = require("typescript");
const { ReactDocgenTypeScriptPlugin } = require("react-docgen-typescript-plugin-delazyify");

module.exports = {
  plugins: [
    // Will default to loading your root tsconfig.json
    new ReactDocgenTypeScriptPlugin(),
    // or with a specific tsconfig
    new ReactDocgenTypeScriptPlugin({ tsconfigPath: "./tsconfig.dev.json" }),
    // or with compiler options
    new ReactDocgenTypeScriptPlugin({ compilerOptions: { jsx: ts.JsxEmit.Preserve } }),
  ],
};
```

This package targets webpack 5 and modern Node runtimes. Webpack and TypeScript
are peer dependencies supplied by the consuming project. The plugin uses your
project `tsconfig.json` by default, including modern options such as
`allowSyntheticDefaultImports` and `esModuleInterop`.

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

## Prior Art

- [sn-client](https://github.com/SenseNet/sn-client/) - Inspired by this custom webpack plugin
- [react-docgen-typescript-loader](https://github.com/strothj/react-docgen-typescript-loader/) - Webpack loader to generate docgen information from Typescript React components.

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="http://hipstersmoothie.com/"><img src="https://avatars3.githubusercontent.com/u/1192452?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Andrew Lisowski</b></sub></a><br /><a href="https://github.com/hipstersmoothie/react-docgen-typescript-plugin/commits?author=hipstersmoothie" title="Code">💻</a> <a href="#design-hipstersmoothie" title="Design">🎨</a> <a href="https://github.com/hipstersmoothie/react-docgen-typescript-plugin/commits?author=hipstersmoothie" title="Documentation">📖</a> <a href="#ideas-hipstersmoothie" title="Ideas, Planning, & Feedback">🤔</a> <a href="#maintenance-hipstersmoothie" title="Maintenance">🚧</a> <a href="#infra-hipstersmoothie" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/hipstersmoothie/react-docgen-typescript-plugin/commits?author=hipstersmoothie" title="Tests">⚠️</a></td>
    <td align="center"><a href="http://shilman.net/"><img src="https://avatars2.githubusercontent.com/u/488689?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Michael Shilman</b></sub></a><br /><a href="https://github.com/hipstersmoothie/react-docgen-typescript-plugin/commits?author=shilman" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/kherock"><img src="https://avatars.githubusercontent.com/u/4993980?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Kyle Herock</b></sub></a><br /><a href="https://github.com/hipstersmoothie/react-docgen-typescript-plugin/commits?author=kherock" title="Code">💻</a></td>
    <td align="center"><a href="https://survivejs.com/"><img src="https://avatars.githubusercontent.com/u/166921?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Juho Vepsäläinen</b></sub></a><br /><a href="#infra-bebraw" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/hipstersmoothie/react-docgen-typescript-plugin/commits?author=bebraw" title="Tests">⚠️</a> <a href="https://github.com/hipstersmoothie/react-docgen-typescript-plugin/commits?author=bebraw" title="Code">💻</a> <a href="https://github.com/hipstersmoothie/react-docgen-typescript-plugin/commits?author=bebraw" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/zhzz"><img src="https://avatars.githubusercontent.com/u/4607770?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Egor Pogadaev</b></sub></a><br /><a href="https://github.com/hipstersmoothie/react-docgen-typescript-plugin/commits?author=zhzz" title="Tests">⚠️</a> <a href="https://github.com/hipstersmoothie/react-docgen-typescript-plugin/commits?author=zhzz" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/sairus2k"><img src="https://avatars.githubusercontent.com/u/1106887?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Anton Savoskin</b></sub></a><br /><a href="https://github.com/hipstersmoothie/react-docgen-typescript-plugin/commits?author=sairus2k" title="Code">💻</a></td>
    <td align="center"><a href="http://trevorburnham.com/"><img src="https://avatars.githubusercontent.com/u/224895?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Trevor Burnham</b></sub></a><br /><a href="https://github.com/hipstersmoothie/react-docgen-typescript-plugin/commits?author=TrevorBurnham" title="Tests">⚠️</a> <a href="https://github.com/hipstersmoothie/react-docgen-typescript-plugin/commits?author=TrevorBurnham" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/meriouma"><img src="https://avatars.githubusercontent.com/u/1082552?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Maxime Meriouma-Caron</b></sub></a><br /><a href="#infra-meriouma" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/hipstersmoothie/react-docgen-typescript-plugin/commits?author=meriouma" title="Tests">⚠️</a> <a href="https://github.com/hipstersmoothie/react-docgen-typescript-plugin/commits?author=meriouma" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/askoufis"><img src="https://avatars.githubusercontent.com/u/5663042?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Adam Skoufis</b></sub></a><br /><a href="https://github.com/hipstersmoothie/react-docgen-typescript-plugin/commits?author=askoufis" title="Code">💻</a></td>
    <td align="center"><a href="https://sorenstudios.com/"><img src="https://avatars.githubusercontent.com/u/295939?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Nicholas Narsing</b></sub></a><br /><a href="https://github.com/hipstersmoothie/react-docgen-typescript-plugin/commits?author=soren121" title="Documentation">📖</a> <a href="https://github.com/hipstersmoothie/react-docgen-typescript-plugin/commits?author=soren121" title="Tests">⚠️</a> <a href="https://github.com/hipstersmoothie/react-docgen-typescript-plugin/commits?author=soren121" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/TimBakerCircle"><img src="https://avatars.githubusercontent.com/u/239700173?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Tim Baker</b></sub></a><br /><a href="https://github.com/TimBakerCircle/react-docgen-typescript-plugin-delazyify/commits?author=TimBakerCircle" title="Code">💻</a> <a href="https://github.com/TimBakerCircle/react-docgen-typescript-plugin-delazyify/commits?author=TimBakerCircle" title="Documentation">📖</a> <a href="#infra-TimBakerCircle" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-TimBakerCircle" title="Maintenance">🚧</a> <a href="https://github.com/TimBakerCircle/react-docgen-typescript-plugin-delazyify/commits?author=TimBakerCircle" title="Tests">⚠️</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
