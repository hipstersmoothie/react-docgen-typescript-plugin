// TODO: How to resolve ts parser issue? Better port config to ts?
const path = require("path");
const { ReactDocgenTypeScriptPlugin } = require("./");

module.exports = {
  mode: "development",
  entry: { main: "./src/__tests__/__fixtures__/Simple.tsx" },
  output: {
    path: path.join(__dirname, "./example-dist"),
  },
  plugins: [new ReactDocgenTypeScriptPlugin()],
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
};
