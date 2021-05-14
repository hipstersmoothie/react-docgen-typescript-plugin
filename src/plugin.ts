import path from "path";
import createDebug from "debug";
import { Compiler, WebpackPluginInstance } from "webpack";
import ts from "typescript";
import * as docGen from "react-docgen-typescript";
import { matcher } from "micromatch";

import { LoaderOptions } from "./types";
import DocGenDependency from "./dependency";
import {
  generateDocgenCodeBlock,
  GeneratorOptions,
} from "./generateDocgenCodeBlock";

const debugExclude = createDebug("docgen:exclude");

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

/** Inject typescript docgen information into modules at the end of a build */
export default class DocgenPlugin implements WebpackPluginInstance {
  private name = "React Docgen Typescript Plugin";
  private options: PluginOptions;

  constructor(options: PluginOptions = {}) {
    this.options = options;
  }

  apply(compiler: Compiler): void {
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

    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      compilation.dependencyTemplates.set(
        DocGenDependency,
        new DocGenDependency.Template()
      );

      compilation.hooks.seal.tap(pluginName, () => {
        for (const module of compilation.modules) {
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

          const componentDocs = docGenParser.parse(nameForCondition);

          module.addDependency(
            new DocGenDependency(
              generateDocgenCodeBlock({
                filename: nameForCondition,
                source: nameForCondition,
                componentDocs,
                ...generateOptions,
              })
            )
          );
        }
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
