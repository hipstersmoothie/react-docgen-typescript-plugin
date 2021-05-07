const { ReactDocgenTypeScriptPlugin } = require("./");

module.exports = {
  mode: "development",
  entry: { main: "./src/__tests__/__fixtures__/Simple.tsx" },
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
