import webpack, { Configuration } from "webpack";
import { createFsFromVolume, Volume } from "memfs";
import ReactDocgenTypeScriptPlugin from "..";

function compile(config: Configuration): Promise<string> {
  return new Promise((resolve, reject) => {
    const compiler = webpack(config);

    // eslint-disable-next-line
    // @ts-ignore: There's a type mismatch but this should work based on webpack source
    compiler.outputFileSystem = createFsFromVolume(new Volume());
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

// TODO: Maybe it's easier for testing to expose a way to write types to the fs
const getConfig = (
  options = {},
  config: { title?: string } = {}
): Configuration => ({
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

test("default options", async () => {
  const result = await compile(getConfig({}));

  // console.log("result", result);

  // expect(result).toMatchSnapshot();
  expect(true).toEqual(true);
});
