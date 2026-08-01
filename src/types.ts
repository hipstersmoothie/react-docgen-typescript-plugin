import type ts from "typescript";
import type { ParserOptions } from "react-docgen-typescript";

export interface Module {
  userRequest: string;
  request: string;
  built?: boolean;
  rawRequest?: string;
  external?: boolean;
  _source: {
    _value: string;
  };
}

export interface LoaderOptions {
  /**
   * Specify the docgen collection name to use. All docgen information will
   * be collected into this global object. Set to null to disable.
   *
   * @default STORYBOOK_REACT_CLASSES
   * @see https://github.com/gongreg/react-storybook-addon-docgen
   **/
  docgenCollectionName?: string | null;

  /**
   * Automatically set the component's display name. If you want to set display
   * names yourself or are using another plugin to do this, you should disable
   * this option.
   *
   * ```
   * class MyComponent extends React.Component {
   * ...
   * }
   *
   * MyComponent.displayName = "MyComponent";
   * ```
   *
   * @default true
   */
  setDisplayName?: boolean;

  /**
   * Specify the name of the property for docgen info prop type.
   *
   * @default "type"
   */
  typePropName?: string;
}

export interface TypescriptOptions {
  /**
   * Specify the location of the tsconfig.json to use. Can not be used with
   * compilerOptions.
   */
  tsconfigPath?: string;

  /** Specify TypeScript compiler options. Can not be used with tsconfigPath. */
  compilerOptions?: ts.CompilerOptions;
}

export interface GlobOptions {
  /** Glob patterns to ignore. */
  exclude?: string[];

  /** Glob patterns to include. Defaults to TSX files. */
  include?: string[];
}

export type PluginOptions = ParserOptions &
  LoaderOptions &
  TypescriptOptions &
  GlobOptions & {
    /** Optional explicit parser options. Top-level parser options remain supported. */
    parserOptions?: ParserOptions;
  };
