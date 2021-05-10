const path = require("path");
const { ReactDocgenTypeScriptPlugin } = require("./");

module.exports = {
  mode: "development",
  entry: { main: "./src/__tests__/__fixtures__/Column.tsx" },
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
