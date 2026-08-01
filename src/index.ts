import type { LoaderOptions, PluginOptions } from "./types";

export type {
  GlobOptions,
  LoaderOptions,
  Module,
  PluginOptions,
  TypescriptOptions,
} from "./types";

export interface ReactDocgenTypeScriptPluginInstance {
  apply(compiler: unknown): void;
}

export interface ReactDocgenTypeScriptPluginConstructor {
  new (options?: PluginOptions): ReactDocgenTypeScriptPluginInstance;
  defaultOptions: Required<LoaderOptions>;
}

class EmptyPlugin {
  public static defaultOptions = {
    setDisplayName: true,
    typePropName: "type",
    docgenCollectionName: "STORYBOOK_REACT_CLASSES",
  };

  constructor(_: PluginOptions = {}) {}

  apply(_compiler: unknown): void {}
}

let plugin: ReactDocgenTypeScriptPluginConstructor;

// It should be possible to use the plugin without TypeScript.
// In that case using it is a no-op.
try {
  require.resolve("typescript");
  plugin =
    require("./plugin").default as ReactDocgenTypeScriptPluginConstructor;
} catch {
  plugin = EmptyPlugin;
}

export { plugin as ReactDocgenTypeScriptPlugin };
export default plugin;
