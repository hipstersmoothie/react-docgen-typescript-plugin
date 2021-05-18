/* eslint-disable  */

import type { DocgenPluginType, PluginOptions } from "./plugin";

class EmptyPlugin {
  constructor(_: PluginOptions) {}
  apply() {}
}

let plugin: DocgenPluginType;

try {
  require.resolve("typescript");
  plugin = require("./plugin").default;
} catch (error) {
  console.error(error);

  plugin = EmptyPlugin as any;
}

export { PluginOptions } from "./plugin";
export { plugin as ReactDocgenTypeScriptPlugin };
export default plugin;
