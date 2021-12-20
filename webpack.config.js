const path = require("path");

module.exports = {
  // 入口文件
  entry: "./src/index.js",
  // 输出文件
  output: {
    path: path.resolve(__dirname, "example/dist"),
    // 输出文件名称
    filename: "Idw2Contour-utils.js",
    library: "Idw2ContourUtils",
    libraryTarget: "umd",
  },
  // 模式（development（开发） / production（生产））
  mode: "development",

  devServer: {
    static: {
      directory: path.resolve(__dirname, "example"),
    },
    compress: true,
    port: 9000,
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/, // 不对npm文件夹进行转换
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
            },
          },
        ],
      },
    ],
  },
};
