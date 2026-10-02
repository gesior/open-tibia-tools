const path = require('path');

module.exports = {
  mode: 'production',
  target: 'node',
  externalsPresets: {node: true},
  entry: {
    itemImageGenerator: './cli/itemImageGenerator.ts',
    itemImageFramesGenerator: './cli/itemImageFramesGenerator.ts',
    outfitImageGenerator: './cli/outfitImageGenerator.ts'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'js/cli')
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      exclude: /node_modules/,
      use: {
        loader: 'ts-loader',
        options: {
          transpileOnly: true
        }
      }
    }]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  optimization: {
    splitChunks: false
  }
};
