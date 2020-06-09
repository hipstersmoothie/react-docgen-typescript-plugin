import path from "path";
import * as webpack from "webpack";
import ts from "typescript";
import docGen from "react-docgen-typescript";
import { StaticPropFilter } from "react-docgen-typescript/lib/parser";
import generateDocgenCodeBlock from "react-docgen-typescript-loader/dist/generateDocgenCodeBlock.js";

export type PluginOptions = docGen.ParserOptions &
  StaticPropFilter & {
    /**
     * Specify the location of the tsconfig.json to use. Can not be used with
     * compilerOptions.
     **/
    tsconfigPath?: string;

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
     * Specifiy the name of the property for docgen info prop type.
     *
     * @default "type"
     */
    typePropName?: string;
  };

function processModule(
  {
    tsconfigPath,
    propFilter,
    componentNameResolver,
    shouldExtractLiteralValuesFromEnum,
    shouldRemoveUndefinedFromOptional,
    savePropValueAsString,
    skipPropsWithName,
    skipPropsWithoutDoc,
    ...loaderOptions
  }: PluginOptions,
  module: any,
  tsProgram: ts.Program
) {
  if (!module) {
    return;
  }

  const docgenOptions = {
    propFilter,
    componentNameResolver,
    shouldExtractLiteralValuesFromEnum,
    shouldRemoveUndefinedFromOptional,
    savePropValueAsString,
    skipPropsWithName,
    skipPropsWithoutDoc,
  };

  const docgenParser = tsconfigPath
    ? docGen.withCustomConfig(tsconfigPath, docgenOptions)
    : docGen.withDefaultConfig(docgenOptions);
  const componentDocs = docgenParser.parseWithProgramProvider(
    module.userRequest,
    () => tsProgram
  );

  if (!componentDocs.length) {
    return;
  }

  const docs = generateDocgenCodeBlock({
    filename: module.userRequest,
    source: module.userRequest,
    componentDocs,
    typePropName: "type",
    docgenCollectionName: "STORYBOOK_REACT_CLASSES",
    setDisplayName: true,
    ...loaderOptions,
  }).substring(module.userRequest.length);

  let source = module._source._value;
  source += "\n" + docs + "\n";
  module._source._value = source;
}

export default class DocgenPlugin {
  private options: PluginOptions;

  constructor(options: PluginOptions) {
    this.options = options;
  }

  apply(compiler: webpack.Compiler) {
    const pathRegex = RegExp(`\\${path.sep}src.+\.tsx`);

    compiler.hooks.compilation.tap("DocgenPlugin", (compilation) => {
      compilation.hooks.seal.tap("DocgenPlugin", () => {
        const modulesToProcess: any[] = [];

        compilation.modules.forEach((module) => {
          // Skip ignored / external modules
          if (!module.built || module.external || !module.rawRequest) {
            return;
          }

          if (pathRegex.test(module.request)) {
            modulesToProcess.push(module);
          }
        });

        const tsProgram = ts.createProgram(
          modulesToProcess.map((v) => v.userRequest),
          {
            jsx: ts.JsxEmit.React,
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.Latest,
          }
        );

        modulesToProcess.forEach((m) =>
          processModule(this.options, m, tsProgram)
        );
      });
    });
  }
}
