/* eslint-disable  */

import type { DocgenPluginType, PluginOptions } from "./plugin";

class EmptyPlugin {
  constructor(_: PluginOptions) {}
  apply() {}
}

let plugin: DocgenPluginType;

// It should be possible to use the plugin without TypeScript.
// In that case using it is a no-op.
try {
  require.resolve("typescript");
  plugin = require("./plugin").default;
} catch (error) {
  plugin = EmptyPlugin as any;
}

export { PluginOptions } from "./plugin";
export { plugin as ReactDocgenTypeScriptPlugin };
export default plugin;
