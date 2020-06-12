import path from "path";
import createDebug from "debug";
import * as webpack from "webpack";
import ts from "typescript";
import * as docGen from "react-docgen-typescript";
import generateDocgenCodeBlock from "react-docgen-typescript-loader/dist/generateDocgenCodeBlock";
import match from "micromatch";

const debugExclude = createDebug("docgen:exclude");
const debugInclude = createDebug("docgen:include");

interface TypescriptOptions {
  /**
   * Specify the location of the tsconfig.json to use. Can not be used with
   * compilerOptions.
   **/
  tsconfigPath?: string;
  /** Specify TypeScript compiler options. Can not be used with tsconfigPath. */
  compilerOptions?: ts.CompilerOptions;
}

interface LoaderOptions {
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

export type PluginOptions = docGen.ParserOptions &
  LoaderOptions &
  TypescriptOptions & {
    /** Glob patterns to ignore */
    exclude?: [];
    /** Glob patterns to include. defaults to ts|tsx */
    include?: [];
  };

interface Module {
  userRequest: string;
  request: string;
  built?: boolean;
  rawRequest?: string;
  external?: boolean;
  _source: {
    _value: string;
  };
}

/** Run the docgen parser and inject the result into the output */
function processModule(
  parser: docGen.FileParser,
  webpackModule: Module,
  tsProgram: ts.Program,
  loaderOptions: Required<LoaderOptions>
) {
  if (!webpackModule) {
    return;
  }

  const componentDocs = parser.parseWithProgramProvider(
    webpackModule.userRequest,
    () => tsProgram
  );

  if (!componentDocs.length) {
    return;
  }

  const docs = generateDocgenCodeBlock({
    filename: webpackModule.userRequest,
    source: webpackModule.userRequest,
    componentDocs,
    ...loaderOptions,
  }).substring(webpackModule.userRequest.length);

  // eslint-disable-next-line no-underscore-dangle
  let source = webpackModule._source._value;
  source += `\n${docs}\n`;
  // eslint-disable-next-line no-underscore-dangle, no-param-reassign
  webpackModule._source._value = source;
}

/** Get the contents of the tsconfig in the system */
function getTSConfigFile(tsconfigPath: string): ts.ParsedCommandLine {
  const basePath = path.dirname(tsconfigPath);
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);

  return ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    basePath,
    {},
    tsconfigPath
  );
}

/** Create a glob matching function. */
const matchGlob = (globs: string[]) => (filename: string) =>
  Boolean(filename && globs.find((g) => match([filename], g).length));

/** Inject typescript docgen information into modules at the end of a build */
export default class DocgenPlugin {
  private name = "React Docgen Typescript Plugin";
  private options: PluginOptions;

  constructor(options: PluginOptions) {
    this.options = options;
  }

  apply(compiler: webpack.Compiler) {
    const {
      tsconfigPath,
      docgenCollectionName = "STORYBOOK_REACT_CLASSES",
      setDisplayName = true,
      typePropName = "type",
      compilerOptions: userCompilerOptions,
      exclude = [],
      include = ["**/**.tsx"],
      ...docgenOptions
    } = this.options;

    const isExcluded = matchGlob(exclude);
    const isIncluded = matchGlob(include);

    let compilerOptions = {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.Latest,
    };

    if (userCompilerOptions) {
      compilerOptions = { ...compilerOptions, ...userCompilerOptions };
    }

    if (tsconfigPath) {
      const { options } = getTSConfigFile(tsconfigPath);
      compilerOptions = { ...compilerOptions, ...options };
    }

    const parser =
      (tsconfigPath && docGen.withCustomConfig(tsconfigPath, docgenOptions)) ||
      docGen.withCompilerOptions(compilerOptions, docgenOptions);

    compiler.hooks.make.tap(this.name, (compilation) => {
      compilation.hooks.seal.tap(this.name, () => {
        const modulesToProcess: Module[] = [];

        compilation.modules.forEach((module: Module) => {
          if (!module.built) {
            debugExclude(`Ignoring un-built module: ${module.userRequest}`);
            return;
          }

          if (module.external) {
            debugExclude(`Ignoring external module: ${module.userRequest}`);
            return;
          }

          if (!module.rawRequest) {
            debugExclude(`Ignoring module without "rawRequest": ${module.userRequest}`);
            return;
          }

          if (isExcluded(module.request)) {
            debugExclude(`Module not matched in "exclude": ${module.userRequest}`);
            return;
          }

          if (!isIncluded(module.request)) {
            debugExclude(`Module not matched in "include": ${module.userRequest}`);
            return;
          }

          debugInclude(module.userRequest);
          modulesToProcess.push(module);
        });

        const tsProgram = ts.createProgram(
          modulesToProcess.map((v) => v.userRequest),
          compilerOptions
        );

        modulesToProcess.forEach((m) =>
          processModule(parser, m, tsProgram, {
            docgenCollectionName,
            setDisplayName,
            typePropName,
          })
        );
      });
    });
  }
}
