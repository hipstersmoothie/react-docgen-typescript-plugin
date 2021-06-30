import webpack, { Configuration } from "webpack";
import { createFsFromVolume, IFs, Volume } from "memfs";
import ReactDocgenTypeScriptPlugin from "..";
import { LoaderOptions } from "../types";

// eslint-disable-next-line
const joinPath = require("memory-fs/lib/join");

// Hack for webpack 4. This isn't needed with 5
// See more: https://github.com/streamich/memfs/issues/404.
function ensureWebpackMemoryFs(fs: IFs) {
  // Return it back, when it has Webpack 'join' method
  // eslint-disable-next-line
  // @ts-ignore
  if (fs.join) {
    return fs;
  }

  // Create FS proxy, adding `join` method to memfs, but not modifying original object
  const nextFs = Object.create(fs);
  nextFs.join = joinPath;

  return nextFs;
}

function compile(config: Configuration): Promise<string> {
  return new Promise((resolve, reject) => {
    const compiler = webpack(config);

    // eslint-disable-next-line
    // @ts-ignore: There's a type mismatch but this should work based on webpack source
    compiler.outputFileSystem = ensureWebpackMemoryFs(
      createFsFromVolume(new Volume())
    );
    const memfs = compiler.outputFileSystem;

    compiler.run((error, stats) => {
      if (error) {
        return reject(error);
      }

      if (stats?.hasErrors()) {
        return reject(stats.toString("errors-only"));
      }

      memfs.readFile(
        "./dist/main.js",
        {
          encoding: "utf-8",
        },
        // eslint-disable-next-line
        // @ts-ignore: Type mismatch again
        (err, data) => (err ? reject(err) : resolve(data))
      );

      return undefined;
    });
  });
}

const getConfig = (
  options = {},
  config: { title?: string } = {}
): Configuration => ({
  mode: "none",
  entry: { main: "./src/__tests__/__fixtures__/Simple.tsx" },
  plugins: [new ReactDocgenTypeScriptPlugin(options)],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        options: {
          transpileOnly: true,
        },
      },
    ],
  },
  ...config,
});

// TODO: What else to test and how?
test("default options", async () => {
  const result = await compile(getConfig({}));

  expect(result).toContain("STORYBOOK_REACT_CLASSES");
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
    const { defaultOptions } = ReactDocgenTypeScriptPlugin;

    (Object.keys(options) as Array<keyof LoaderOptions>).forEach(
      (optionName) => {
        const values = options[optionName];

        test.each(values)(`${optionName}: %p`, (value) => {
          const plugin = new ReactDocgenTypeScriptPlugin({
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
});
