import path from 'node:path';

import * as docgen from 'react-docgen-typescript';
// import { matcher } from 'micromatch';
import ts from 'typescript';
import type * as webpack from 'webpack';

const loaderLocation = require.resolve(__dirname + '/../dist/loader.js');

interface TypescriptOptions {
  /**
   * Specify the location of the tsconfig.json to use. Can not be used with
   * compilerOptions.
   **/
  tsconfigPath?: string;
  /** Specify TypeScript compiler options. Can not be used with tsconfigPath. */
  compilerOptions?: Parameters<typeof docgen.withCompilerOptions>[0];
  /** Specify parser options. */
  parserOptions?: Parameters<typeof docgen.withCompilerOptions>[1];
}

export type PluginOptions = TypescriptOptions & {
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

    return ts.parseJsonConfigFileContent(configFile.config, ts.sys, basePath, {}, tsconfigPath);
  } catch {
    return {} as ts.ParsedCommandLine;
  }
}

/** Inject typescript docgen information into modules at the end of a build */
export class ReactDocgenTypeScriptPlugin implements webpack.WebpackPluginInstance {
  private readonly name = 'react-docgen-typescript-plugin';
  private options: PluginOptions;

  constructor(options: PluginOptions = {}) {
    this.options = options;
  }

  apply(compiler: webpack.Compiler): void {
    const options = this.getOptions();
    const parser = docgen.withCompilerOptions(options.compilerOptions, options.parserOptions);

    compiler.hooks.compilation.tap(this.name, (_, { normalModuleFactory }) => {
      normalModuleFactory.hooks.afterResolve.tap(this.name, (result) => {
        if (/\.(tsx?)$/.test(result.request)) {
          result.createData.loaders = result.createData.loaders || [];

          result.createData.loaders?.push({
            loader: loaderLocation,
            options: { parser },
          });
        }
      });
    });
  }

  getOptions(): {
    compilerOptions: Parameters<typeof docgen.withCompilerOptions>[0];
    parserOptions: Parameters<typeof docgen.withCompilerOptions>[1];
  } {
    const {
      tsconfigPath = './tsconfig.json',
      compilerOptions: userCompilerOptions,
      parserOptions: userParserOptions,
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
      compilerOptions = {
        ...compilerOptions,
        ...tsOptions,
      };
    }

    return {
      compilerOptions,
      parserOptions: {
        ...userParserOptions,
        shouldIncludeExpression: true,
      },
    };
  }
}
