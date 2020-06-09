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

```ts
const ReactDocgenTypescriptPlugin = require('react-docgen-typescript-plugin');

module.exports = {
  plugins: [new ReactDocgenTypescriptPlugin()],
};
```

## Prior Art

- [sn-client](https://github.com/SenseNet/sn-client/pull/113/files) - Inspired by this custom webpack plugin
