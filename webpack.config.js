var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

var mode = process.env.NODE_ENV ? process.env.NODE_ENV : "NONE";

console.log("--------------------------------------------------");
console.log(`Building in ${mode.toUpperCase()} mode.`);
console.log("--------------------------------------------------");

var config = {
    entry: './src/index.js',
    output: {
        filename: './dist/bundle.js'
    },
    devtool: 'source-map',
    module: {
        // Note: Use 'rules' rather than 'loaders' (which is deprecated)
        rules: [
            {
                test: /\.js$/,
                loaders: 'babel-loader',
                query: {
                    presets: ['es2015']
                }
            },
            {
                test: /\.(s*)css$/,
                use: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: ['css-loader', 'sass-loader']
                })
            }
        ]
    },
    plugins: [
        new ExtractTextPlugin({filename: 'dist/style.css'})
    ]
};

module.exports = config;
