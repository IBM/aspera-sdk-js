const path = require('path');
const webpack = require('webpack');

const packageFile = require('./package.json');
let version = '';

if (packageFile.version) {
  version = `v${packageFile.version}`;
}

const banner = `IBM Aspera Desktop SDK ${version}\nLicensed Materials – Property of IBM\n© Copyright IBM Corp. 2023\nU.S. Government Users Restricted Rights: Use, duplication or disclosure restricted by\nGSA ADP Schedule Contract with IBM Corp.`;

module.exports = {
  entry: './src/index.ts',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist/js'),
    filename: 'aspera-desktop-sdk.js'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: ['ts-loader'],
        exclude: /node_modules/
      }
    ]
  },
  devServer: {
    server: {
      type: 'https',
    },
    open: true,
    static: [
      {
        publicPath: '/',
        directory: './src',
      },
      {
        publicPath: '/aspera-desktop-sdk-js/docs',
        directory: './dist/js/docs',
      },
    ],
    host: 'desktop-sdk.aspera.us',
    port: 4205
  },
  plugins: [
    new webpack.BannerPlugin(banner)
  ]
};
