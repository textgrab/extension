const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const Dotenv = require("dotenv-webpack");

module.exports = merge(common, {
  mode: "production",
  plugins: [
    new Dotenv({
      path: "env/.prod.env",
      safe: "env/.env.example",
      silent: false,
    }),
  ],
});
