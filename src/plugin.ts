/* eslint-disable no-param-reassign, no-underscore-dangle */

import path from "path";
import createDebug from "debug";
import * as webpack from "webpack";
import ts from "typescript";
import * as docGen from "react-docgen-typescript";
import { matcher } from "micromatch";
import findCacheDir from "find-cache-dir";
import flatCache from "flat-cache";
import crypto from "crypto";

import { generateDocgenCodeBlock } from "./generateDocgenCodeBlock";

const debugExclude = createDebug("docgen:exclude");
const debugInclude = createDebug("docgen:include");
const debugDocs = createDebug("docgen:docs");

const cacheId = "ts-docgen";
const cacheDir = findCacheDir({ name: cacheId });
const cache = flatCache.load(cacheId, cacheDir);

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
    exclude?: string[];
    /** Glob patterns to include. defaults to ts|tsx */
    include?: string[];
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

  const hash = crypto
    .createHash("sha1")
    .update(webpackModule._source._value)
    .digest("hex");
  const cached = cache.getKey(hash);

  if (cached) {
    debugInclude(`Got cached docgen for "${webpackModule.request}"`);
    webpackModule._source._value = cached;
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

  debugDocs(docs);

  let sourceWithDocs = webpackModule._source._value;
  sourceWithDocs += `\n${docs}\n`;
  webpackModule._source._value = sourceWithDocs;

  cache.setKey(hash, sourceWithDocs);
}

/** Get the contents of the tsconfig in the system */
function getTSConfigFile(tsconfigPath: string): ts.ParsedCommandLine {
  try {
    const basePath = path.dirname(tsconfigPath);
    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);

    return ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      basePath,
      {},
      tsconfigPath
    );
  } catch (error) {
    return {} as ts.ParsedCommandLine;
  }
}

/** Create a glob matching function. */
const matchGlob = (globs: string[]) => {
  const matchers = globs.map((g) => matcher(g));
  return (filename: string) =>
    Boolean(filename && matchers.find((match) => match(filename)));
};

/** Inject typescript docgen information into modules at the end of a build */
export default class DocgenPlugin {
  private name = "React Docgen Typescript Plugin";
  private options: PluginOptions;
  private parser;
  private compilerOptions;

  constructor(options: PluginOptions = {}) {
    const {
      tsconfigPath = "./tsconfig.json",
      compilerOptions: userCompilerOptions,
      ...docgenOptions
    } = options;

    let compilerOptions = {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.Latest,
    };

    if (userCompilerOptions) {
      compilerOptions = {
        ...compilerOptions,
        ...userCompilerOptions,
      };
    } else {
      const { options: tsOptions } = getTSConfigFile(tsconfigPath);
      compilerOptions = { ...compilerOptions, ...tsOptions };
    }

    this.options = options;
    this.compilerOptions = compilerOptions;
    this.parser = docGen.withCompilerOptions(compilerOptions, docgenOptions);
  }

  apply(compiler: webpack.Compiler): void {
    // TODO: Add new logic here
    /*
Instead of modifying the source code directly: Add a Dependency to the Module via module.addDependency. Register a DependencyTemplate for that Dependency class (compilation.dependencyTemplates.set(...)). In the DependencyTemplate you can add the code block to the source. Note if you want that modules correctly invalidate and cache you need to add updateHash to your Dependency and hash the type info (because that might change depending on outside factors (other modules). Add a Dependency to the Module via module.addDependency. This should happen during building of modules -> compilation.hooks.buildModule. Dependencies are cached with the Module. The result of the DependencyTemplate is cached when the hash is equal.
*/
    /*
You don't need that tsProgram in buildModule. That can stay in seal. In buildModule you only need to add the Dependency. That's will not need the information from typescript before code generation, which happens during seal (seal hook is the start of seal). 
*/
    /*
Most plugins in webpack/lib/dependencies/*Plugin.js add Dependency and Templates. They add them during parsing, but adding them in buildModule is also fine
*/
  }

  // TODO: Eliminate this one after the new apply works
  oldApply(compiler: webpack.Compiler): void {
    const {
      docgenCollectionName = "STORYBOOK_REACT_CLASSES",
      setDisplayName = true,
      typePropName = "type",
      exclude = [],
      include = ["**/**.tsx"],
    } = this.options;

    const isExcluded = matchGlob(exclude);
    const isIncluded = matchGlob(include);

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
            debugExclude(
              `Ignoring module without "rawRequest": ${module.userRequest}`
            );
            return;
          }

          if (isExcluded(module.userRequest)) {
            debugExclude(
              `Module not matched in "exclude": ${module.userRequest}`
            );
            return;
          }

          if (!isIncluded(module.userRequest)) {
            debugExclude(
              `Module not matched in "include": ${module.userRequest}`
            );
            return;
          }

          debugInclude(module.userRequest);
          modulesToProcess.push(module);
        });

        const tsProgram = ts.createProgram(
          modulesToProcess.map((v) => v.userRequest),
          this.compilerOptions
        );

        modulesToProcess.forEach((m) =>
          processModule(this.parser, m, tsProgram, {
            docgenCollectionName,
            setDisplayName,
            typePropName,
          })
        );

        cache.save();
      });
    });
  }
}

export type DocgenPluginType = typeof DocgenPlugin;
