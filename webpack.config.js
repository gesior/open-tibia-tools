const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    tests: './tests.ts',
    effectFramesGenerator: './effectFramesGenerator.ts',
    missileFramesGenerator: './missileFramesGenerator.ts',
    itemImageGenerator: './itemImageGenerator.ts',
    itemImageFramesGenerator: './itemImageFramesGenerator.ts',
    outfitImageGenerator: './outfitImageGenerator.ts',
    otbEditor: './otbEditor.ts'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'js')
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
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
          enforce: true
        }
      }
    }
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: './node_modules/gif.js/dist/gif.worker.js', to: 'gif.worker.js' }
      ]
    })
  ]
};
