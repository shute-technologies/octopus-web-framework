const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    index: './entry.ts'
  },
  devtool: 'inline-source-map',
  devServer: {
    static: path.join(__dirname, 'dist'),
    compress: true,
    port: 8082
  },
  resolve: {
    extensions: ['.ts', '.js'],
    plugins: [
      new TsconfigPathsPlugin({/* options: see below */})
    ]
  },
  module: {
    rules: [
      { 
        test: /\.ts$/, use: 'ts-loader'
      }
    ]
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: false
  }
};