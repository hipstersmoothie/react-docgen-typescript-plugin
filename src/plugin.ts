import path from "node:path";

import ts from "typescript";
import type * as docGen from "react-docgen-typescript";
import type * as webpack from "webpack";

import type { GeneratorOptions } from "./generateDocgenCodeBlock";
import { clearDocgenLoaderCache, registerDocgenLoaderOptions } from "./loader";
import type { LoaderOptions, PluginOptions } from "./types";

type GenerateOptions = Pick<
  GeneratorOptions,
  "docgenCollectionName" | "setDisplayName" | "typePropName"
>;

type ResolvedOptions = {
  docgenOptions: docGen.ParserOptions;
  generateOptions: GenerateOptions;
  compilerOptions: ts.CompilerOptions;
  fileNames: string[];
};

type NormalModuleResolveData = {
  request?: string;
  resource?: string;
  createData: {
    resource?: string;
    loaders?: Array<{ loader: string; options?: unknown }>;
  };
};

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function expandSimpleBraces(glob: string): string[] {
  const match = /\{([^{}]+)\}/.exec(glob);

  if (!match) {
    return [glob];
  }

  const expression = match[0];
  const body = match[1] || "";
  const before = glob.slice(0, match.index);
  const after = glob.slice(match.index + expression.length);

  return body
    .split(",")
    .flatMap((part) => expandSimpleBraces(`${before}${part}${after}`));
}

function globToRegExp(glob: string): RegExp {
  const normalizedGlob = glob.replace(/\\/g, "/");
  let pattern = "^";

  for (let index = 0; index < normalizedGlob.length; index += 1) {
    const character = normalizedGlob.charAt(index);
    const nextCharacter = normalizedGlob.charAt(index + 1);

    if (character === "*") {
      if (nextCharacter === "*") {
        const afterGlobstar = normalizedGlob[index + 2];

        if (afterGlobstar === "/") {
          pattern += "(?:.*\\/)?";
          index += 2;
        } else {
          pattern += ".*";
          index += 1;
        }
      } else {
        pattern += "[^/]*";
      }

      continue;
    }

    if (character === "?") {
      pattern += "[^/]";
      continue;
    }

    pattern += escapeRegExp(character);
  }

  return new RegExp(`${pattern}$`);
}

/** Get the contents of the tsconfig in the system. */
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
  } catch {
    return {
      options: {},
      fileNames: [],
      errors: [],
    };
  }
}

/** Create a glob matching function. */
const matchGlob = (globs?: string[]) => {
  const matchers = (globs || [])
    .flatMap(expandSimpleBraces)
    .map(globToRegExp);

  return (filename: string) => {
    const normalizedFilename = filename.replace(/\\/g, "/");

    return Boolean(
      normalizedFilename &&
        matchers.find((matches) => matches.test(normalizedFilename))
    );
  };
};

/** Inject TypeScript docgen information into TSX modules. */
export default class DocgenPlugin implements webpack.WebpackPluginInstance {
  public static defaultOptions: Required<LoaderOptions> = {
    setDisplayName: true,
    typePropName: "type",
    docgenCollectionName: "STORYBOOK_REACT_CLASSES",
  };

  private readonly name = "React Docgen Typescript Plugin";
  private readonly options: PluginOptions;

  constructor(options: PluginOptions = {}) {
    this.options = options;
  }

  apply(compiler: webpack.Compiler): void {
    const webpackVersion = compiler.webpack?.version || "";
    const isWebpack5 =
      Number.parseInt(webpackVersion.split(".")[0] || "0", 10) >= 5;

    if (!isWebpack5) {
      throw new Error(
        "react-docgen-typescript-plugin v2 requires webpack 5 or newer."
      );
    }

    const { exclude = [], include = ["**/**.tsx"] } = this.options;
    const isExcluded = matchGlob(exclude);
    const isIncluded = matchGlob(include);
    const resolvedOptions = this.getOptions();
    const configId = registerDocgenLoaderOptions(resolvedOptions);
    const loaderLocation = path.resolve(__dirname, "../dist/loader.js");

    compiler.hooks.compilation.tap(
      this.name,
      (_compilation, { normalModuleFactory }) => {
        clearDocgenLoaderCache(configId);

        normalModuleFactory.hooks.afterResolve.tap(
          this.name,
          (resolveData: NormalModuleResolveData) => {
            const resource =
              resolveData.createData.resource ||
              resolveData.resource ||
              resolveData.request ||
              "";

            if (!resource) {
              return;
            }

            if (isExcluded(resource)) {
              return;
            }

            if (!isIncluded(resource)) {
              return;
            }

            resolveData.createData.loaders =
              resolveData.createData.loaders || [];
            resolveData.createData.loaders.push({
              loader: loaderLocation,
              options: { configId },
            });
          }
        );
      }
    );
  }

  getOptions(): ResolvedOptions {
    const {
      tsconfigPath = "./tsconfig.json",
      compilerOptions: userCompilerOptions,
      docgenCollectionName,
      setDisplayName,
      typePropName,
      exclude: _exclude,
      include: _include,
      parserOptions,
      ...topLevelDocgenOptions
    } = this.options;
    const { defaultOptions } = DocgenPlugin;

    let fileNames: string[] = [];
    let compilerOptions: ts.CompilerOptions = {
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
      const { fileNames: tsFileNames, options: tsOptions } =
        getTSConfigFile(tsconfigPath);

      fileNames = tsFileNames;
      compilerOptions = { ...compilerOptions, ...tsOptions };
    }

    return {
      docgenOptions: {
        shouldIncludeExpression: true,
        ...topLevelDocgenOptions,
        ...parserOptions,
      },
      generateOptions: {
        docgenCollectionName:
          docgenCollectionName === undefined
            ? defaultOptions.docgenCollectionName
            : docgenCollectionName,
        setDisplayName: setDisplayName ?? defaultOptions.setDisplayName,
        typePropName: typePropName ?? defaultOptions.typePropName,
      },
      compilerOptions,
      fileNames,
    };
  }
}

export type DocgenPluginType = typeof DocgenPlugin;
export type { PluginOptions } from "./types";
