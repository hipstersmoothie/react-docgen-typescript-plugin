import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";
import ts from "typescript";
import webpack, { type Configuration } from "webpack";

import SourcePlugin from "../plugin";
import type { LoaderOptions } from "../types";

const projectRoot = path.resolve(__dirname, "../..");
const outputPath = path.join(projectRoot, "test-output");
const outputFile = path.join(outputPath, "main.js");

function compile(config: Configuration): Promise<string> {
  return new Promise((resolve, reject) => {
    const compiler = webpack(config);

    compiler.run((error, stats) => {
      compiler.close((closeError) => {
        if (error) {
          reject(error);
          return;
        }

        if (closeError) {
          reject(closeError);
          return;
        }

        if (stats?.hasErrors()) {
          reject(new Error(stats.toString("errors-only")));
          return;
        }

        resolve(fs.readFileSync(outputFile, "utf8"));
      });
    });
  });
}

function getConfig(plugin: unknown): Configuration {
  return {
    context: projectRoot,
    mode: "none",
    entry: { main: "./src/__tests__/__fixtures__/Simple.tsx" },
    output: {
      path: outputPath,
      filename: "main.js",
    },
    optimization: {
      minimize: false,
    },
    plugins: [plugin as NonNullable<Configuration["plugins"]>[number]],
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: require.resolve("ts-loader"),
          options: {
            transpileOnly: true,
            compilerOptions: {
              declaration: false,
              declarationMap: false,
              noEmit: false,
            },
          },
        },
      ],
    },
  };
}

describe("webpack plugin compatibility", () => {
  beforeAll(() => {
    execFileSync("npm", ["run", "build"], {
      cwd: projectRoot,
      stdio: "inherit",
    });
  });

  it("supports CommonJS named construction and injects legacy docgen output", async () => {
    const { ReactDocgenTypeScriptPlugin } = require("../../dist");
    const result = await compile(getConfig(new ReactDocgenTypeScriptPlugin()));

    expect(ReactDocgenTypeScriptPlugin).toBeTypeOf("function");
    expect(result).toContain("SimpleComponent.__docgenInfo");
    expect(result).toContain("STORYBOOK_REACT_CLASSES");
    expect(result).toContain("Simple.tsx#SimpleComponent");
  }, 20_000);

  it("respects include globs without micromatch", async () => {
    const { ReactDocgenTypeScriptPlugin } = require("../../dist");
    const result = await compile(
      getConfig(
        new ReactDocgenTypeScriptPlugin({
          include: ["**/*.{ts,tsx}"],
        })
      )
    );

    expect(result).toContain("SimpleComponent.__docgenInfo");
  }, 20_000);

  it("respects exclude globs without micromatch", async () => {
    const { ReactDocgenTypeScriptPlugin } = require("../../dist");
    const result = await compile(
      getConfig(
        new ReactDocgenTypeScriptPlugin({
          exclude: ["**/*.tsx"],
        })
      )
    );

    expect(result).not.toContain("SimpleComponent.__docgenInfo");
  }, 20_000);

  it("supports modern TypeScript interop compiler options", async () => {
    const { ReactDocgenTypeScriptPlugin } = require("../../dist");
    const result = await compile(
      getConfig(
        new ReactDocgenTypeScriptPlugin({
          compilerOptions: {
            allowSyntheticDefaultImports: true,
            esModuleInterop: true,
            jsx: ts.JsxEmit.React,
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.Latest,
          },
        })
      )
    );

    expect(result).toContain("SimpleComponent.__docgenInfo");
  }, 20_000);
});

describe("custom options", () => {
  describe("loader options", () => {
    const options: Record<
      keyof LoaderOptions,
      Array<LoaderOptions[keyof LoaderOptions]>
    > = {
      setDisplayName: [true, false, undefined],
      typePropName: ["customValue", undefined],
      docgenCollectionName: ["customValue", null, undefined],
    };
    const { defaultOptions } = SourcePlugin;

    (Object.keys(options) as Array<keyof LoaderOptions>).forEach(
      (optionName) => {
        const values = options[optionName];

        it.each(values)(`${optionName}: %p`, (value) => {
          const plugin = new SourcePlugin({
            [optionName]: value,
          });
          const { generateOptions: resultOptions } = plugin.getOptions();

          expect(resultOptions[optionName]).toBe(
            value === undefined ? defaultOptions[optionName] : value
          );
        });
      }
    );
  });

  it("preserves parsed tsconfig files for project-level docgen programs", () => {
    const plugin = new SourcePlugin({
      tsconfigPath: path.join(projectRoot, "tsconfig.json"),
    });

    expect(plugin.getOptions().fileNames).toContain(
      path.join(projectRoot, "src/plugin.ts")
    );
  });
});
