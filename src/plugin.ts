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

import DocgenDependency from "./DocgenDependency"
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


/** Run the docgen parser and return string */
function getDocsFromModule(
  parser: docGen.FileParser,
  webpackUserRequest: webpack.NormalModule['userRequest'],
  loaderOptions: Required<LoaderOptions>
): string | null {
  const componentDocs = parser.parse(webpackUserRequest);

  if (!componentDocs.length) {
    return null;
  }

  return generateDocgenCodeBlock({
    filename: webpackUserRequest,
    source: webpackUserRequest,
    componentDocs,
    ...loaderOptions,
  }).substring(webpackUserRequest.length);
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
export default class DocgenPlugin implements webpack.WebpackPluginInstance  {
  private name = "React Docgen Typescript Plugin";
  private options: PluginOptions;

  constructor(options: PluginOptions = {}) {
    this.options = options;
  }

  apply(compiler: webpack.Compiler): void {
    const {
      tsconfigPath = "./tsconfig.json",
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
      compilerOptions = {
        ...compilerOptions,
        ...userCompilerOptions,
      };
    } else {
      const { options } = getTSConfigFile(tsconfigPath);
      compilerOptions = { ...compilerOptions, ...options };
    }

    const parser = docGen.withCompilerOptions(compilerOptions, docgenOptions);
    
    compiler.hooks.compilation.tap(this.name, (compilation, { normalModuleFactory }) => {
      compilation.dependencyTemplates.set(DocgenDependency, new DocgenDependency.Template());
      
      const handler = (webpackParser: webpack.javascript.JavascriptParser) => {
        webpackParser.hooks.program.tap(this.name, () => {
          const currentModule = webpackParser.state.module;

          if (!currentModule.rawRequest) {
            debugExclude(
              `Ignoring module without "rawRequest": ${currentModule.rawRequest}`
            );
            return;
          }

          if (isExcluded(currentModule.userRequest)) {
            debugExclude(
              `Module not matched in "exclude": ${currentModule.userRequest}`
            );
            return;
          }

          if (!isIncluded(currentModule.userRequest)) {
            debugExclude(
              `Module not matched in "include": ${currentModule.userRequest}`
            );
            return;
          }

          debugInclude(currentModule.userRequest);


          const docs = getDocsFromModule(parser, currentModule.userRequest, {
            docgenCollectionName,
            setDisplayName,
            typePropName,
          })

          debugDocs(docs);

          if (docs) {
            const dependency = new DocgenDependency(docs)

            if (currentModule.addPresentationalDependency) {
              currentModule.addPresentationalDependency(dependency)
            } else {
              currentModule.addDependency(dependency)
            }
          }
        })
      }

      normalModuleFactory.hooks.parser
        .for("javascript/auto")
        .tap(this.name, handler);
      normalModuleFactory.hooks.parser
        .for("javascript/dynamic")
        .tap(this.name, handler);
      normalModuleFactory.hooks.parser
        .for("javascript/esm")
        .tap(this.name, handler);
    });
  }
}

export type DocgenPluginType = typeof DocgenPlugin;
