import path from "path";
import createDebug from "debug";
import ts from "typescript";
import * as docGen from "react-docgen-typescript";
import { matcher } from "micromatch";
import * as webpack from "webpack";
import findCacheDir from "find-cache-dir";
import flatCache from "flat-cache";
import crypto from "crypto";

import { LoaderOptions } from "./types";
import {
  generateDocgenCodeBlock,
  GeneratorOptions,
} from "./generateDocgenCodeBlock";

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

export type PluginOptions = docGen.ParserOptions &
  LoaderOptions &
  TypescriptOptions & {
    /** Glob patterns to ignore */
    exclude?: string[];
    /** Glob patterns to include. defaults to ts|tsx */
    include?: string[];
  };

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
const matchGlob = (globs?: string[]) => {
  const matchers = (globs || []).map((g) => matcher(g, { dot: true }));

  return (filename: string) =>
    Boolean(filename && matchers.find((match) => match(filename)));
};

// The cache is used only with webpack 4 for now as webpack 5 comes with caching of its own
const cacheId = "ts-docgen";
const cacheDir = findCacheDir({ name: cacheId });
const cache = flatCache.load(cacheId, cacheDir);

/** Run the docgen parser and inject the result into the output */
/** This is used for webpack 4 or earlier */
function processModule(
  parser: docGen.FileParser,
  webpackModule: webpack.Module,
  tsProgram: ts.Program,
  loaderOptions: Required<LoaderOptions>
) {
  if (!webpackModule) {
    return;
  }

  const hash = crypto
    .createHash("sha1")
    // eslint-disable-next-line
    // @ts-ignore
    // eslint-disable-next-line
    .update(webpackModule._source._value)
    .digest("hex");
  const cached = cache.getKey(hash);

  if (cached) {
    // eslint-disable-next-line
    // @ts-ignore
    // eslint-disable-next-line
    debugInclude(`Got cached docgen for "${webpackModule.request}"`);
    // eslint-disable-next-line
    // @ts-ignore
    // eslint-disable-next-line
    webpackModule._source._value = cached;
    return;
  }

  // eslint-disable-next-line
  // @ts-ignore: Webpack 4 type
  const { userRequest } = webpackModule;

  const componentDocs = parser.parseWithProgramProvider(
    userRequest,
    () => tsProgram
  );

  if (!componentDocs.length) {
    return;
  }

  const docs = generateDocgenCodeBlock({
    filename: userRequest,
    source: userRequest,
    componentDocs,
    ...loaderOptions,
  }).substring(userRequest.length);

  // eslint-disable-next-line
  // @ts-ignore: Webpack 4 type
  // eslint-disable-next-line
  let sourceWithDocs = webpackModule._source._value;

  sourceWithDocs += `\n${docs}\n`;

  // eslint-disable-next-line
  // @ts-ignore: Webpack 4 type
  // eslint-disable-next-line
  webpackModule._source._value = sourceWithDocs;
}

/** Inject typescript docgen information into modules at the end of a build */
export default class DocgenPlugin implements webpack.WebpackPluginInstance {
  private name = "React Docgen Typescript Plugin";
  private options: PluginOptions;

  constructor(options: PluginOptions = {}) {
    this.options = options;
  }

  apply(compiler: webpack.Compiler): void {
    // Property compiler.version is set only starting from webpack 5
    const webpackVersion = compiler.webpack?.version || "";
    const isWebpack5 = parseInt(webpackVersion.split(".")[0], 10) >= 5;

    if (isWebpack5) {
      this.applyWebpack5(compiler);
    } else {
      this.applyWebpack4(compiler);
    }
  }

  applyWebpack5(compiler: webpack.Compiler): void {
    const pluginName = "DocGenPlugin";
    const {
      docgenOptions,
      compilerOptions,
      generateOptions,
    } = this.getOptions();
    const docGenParser = docGen.withCompilerOptions(
      compilerOptions,
      docgenOptions
    );
    const { exclude = [], include = ["**/**.tsx"] } = this.options;
    const isExcluded = matchGlob(exclude);
    const isIncluded = matchGlob(include);

    compiler.hooks.compilation.tap(
      pluginName,
      (compilation: webpack.Compilation) => {
        // Since this file is needed only for webpack 5, load it only then
        // to simplify the implementation of the file.
        //
        // eslint-disable-next-line
        const { DocGenDependency } = require("./dependency");

        compilation.dependencyTemplates.set(
          // eslint-disable-next-line
          // @ts-ignore: Webpack 4 type
          DocGenDependency,
          // eslint-disable-next-line
          // @ts-ignore: Webpack 4 type
          new DocGenDependency.Template()
        );

        compilation.hooks.seal.tap(pluginName, () => {
          const modulesToProcess: [string, webpack.Module][] = [];

          // 1. Aggregate modules to process
          compilation.modules.forEach((module: webpack.Module) => {
            if (!module.nameForCondition) {
              return;
            }

            const nameForCondition = module.nameForCondition() || "";

            if (isExcluded(nameForCondition)) {
              debugExclude(
                `Module not matched in "exclude": ${nameForCondition}`
              );
              return;
            }

            if (!isIncluded(nameForCondition)) {
              debugExclude(
                `Module not matched in "include": ${nameForCondition}`
              );
              return;
            }

            modulesToProcess.push([nameForCondition, module]);
          });

          // 2. Create a ts program with the modules
          const tsProgram = ts.createProgram(
            modulesToProcess.map(([name]) => name),
            compilerOptions
          );

          // 3. Process and parse each module and add the type information
          // as a dependency
          modulesToProcess.forEach(([name, module]) => {
            // Since this file is needed only for webpack 5, load it only then
            // to simplify the implementation of the file.
            //
            // eslint-disable-next-line
            const { DocGenDependency } = require("./dependency");

            module.addDependency(
              // eslint-disable-next-line
              // @ts-ignore: Webpack 4 type
              new DocGenDependency(
                generateDocgenCodeBlock({
                  filename: name,
                  source: name,
                  componentDocs: docGenParser.parseWithProgramProvider(
                    name,
                    () => tsProgram
                  ),
                  ...generateOptions,
                }).substring(name.length)
              )
            );
          });
        });
      }
    );
  }

  applyWebpack4(compiler: webpack.Compiler): void {
    const { docgenOptions, compilerOptions } = this.getOptions();
    const parser = docGen.withCompilerOptions(compilerOptions, docgenOptions);
    const { exclude = [], include = ["**/**.tsx"] } = this.options;
    const isExcluded = matchGlob(exclude);
    const isIncluded = matchGlob(include);

    compiler.hooks.make.tap(this.name, (compilation) => {
      compilation.hooks.seal.tap(this.name, () => {
        const modulesToProcess: webpack.Module[] = [];

        compilation.modules.forEach((module: webpack.Module) => {
          // eslint-disable-next-line
          // @ts-ignore: Webpack 4 type
          if (!module.built) {
            // eslint-disable-next-line
            // @ts-ignore: Webpack 4 type
            debugExclude(`Ignoring un-built module: ${module.userRequest}`);
            return;
          }

          // eslint-disable-next-line
          // @ts-ignore: Webpack 4 type
          if (module.external) {
            // eslint-disable-next-line
            // @ts-ignore: Webpack 4 type
            debugExclude(`Ignoring external module: ${module.userRequest}`);
            return;
          }

          // eslint-disable-next-line
          // @ts-ignore: Webpack 4 type
          if (!module.rawRequest) {
            debugExclude(
              // eslint-disable-next-line
              // @ts-ignore: Webpack 4 type
              `Ignoring module without "rawRequest": ${module.userRequest}`
            );
            return;
          }

          // eslint-disable-next-line
          // @ts-ignore: Webpack 4 type
          if (isExcluded(module.userRequest)) {
            debugExclude(
              // eslint-disable-next-line
              // @ts-ignore: Webpack 4 type
              `Module not matched in "exclude": ${module.userRequest}`
            );
            return;
          }

          // eslint-disable-next-line
          // @ts-ignore: Webpack 4 type
          if (!isIncluded(module.userRequest)) {
            debugExclude(
              // eslint-disable-next-line
              // @ts-ignore: Webpack 4 type
              `Module not matched in "include": ${module.userRequest}`
            );
            return;
          }

          // eslint-disable-next-line
          // @ts-ignore: Webpack 4 type
          debugInclude(module.userRequest);
          modulesToProcess.push(module);
        });

        const tsProgram = ts.createProgram(
          // eslint-disable-next-line
          // @ts-ignore: Webpack 4 type
          modulesToProcess.map((v) => v.userRequest),
          compilerOptions
        );

        modulesToProcess.forEach((m) =>
          processModule(parser, m, tsProgram, {
            docgenCollectionName: "STORYBOOK_REACT_CLASSES",
            setDisplayName: true,
            typePropName: "type",
          })
        );

        cache.save();
      });
    });
  }

  getOptions(): {
    docgenOptions: docGen.ParserOptions;
    generateOptions: {
      docgenCollectionName: GeneratorOptions["docgenCollectionName"];
      setDisplayName: GeneratorOptions["setDisplayName"];
      typePropName: GeneratorOptions["typePropName"];
    };
    compilerOptions: ts.CompilerOptions;
  } {
    const {
      tsconfigPath = "./tsconfig.json",
      compilerOptions: userCompilerOptions,
      docgenCollectionName,
      setDisplayName,
      typePropName,
      ...docgenOptions
    } = this.options;

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

    return {
      docgenOptions,
      generateOptions: {
        docgenCollectionName: docgenCollectionName || "STORYBOOK_REACT_CLASSES",
        setDisplayName: setDisplayName || true,
        typePropName: typePropName || "type",
      },
      compilerOptions,
    };
  }
}

export type DocgenPluginType = typeof DocgenPlugin;
