const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
//const {CleanWebpackPlugin} = require('clean-webpack-plugin');

const path = require('path');

var mode = process.env.NODE_ENV ? process.env.NODE_ENV.toUpperCase() : "DEV";
var IS_PROD = mode === 'PRODUCTION'; 

console.log("--------------------------------------------------");
console.log(`Building in ${mode.toUpperCase()} mode.`);
console.log("--------------------------------------------------");

var optional_rules = [];

// transpiling to ES6 is time-consuming, so only do so for production
if (IS_PROD) {
    optional_rules = [
        {
            test: /\.js$/,
            exclude: /node_modules/,
            loaders: 'babel-loader',
            query: {
                presets: ['es2015']
            }
        }
    ];
}


var config = {
    entry: './src/index.js',
    output: {
        filename : 'bundle.js',
        path : path.resolve(__dirname, 'dist')
    },
    devtool: 'source-map',
    module: {
        // Note: Use 'rules' rather than 'loaders' (which is deprecated)
        rules: [
            {
                test: /\.(s*)css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    { loader: 'css-loader', options: { url: false, sourceMap: true }},
                    { loader: 'sass-loader', options: {sourceMap: true } }
                ],
            }
        ].concat(optional_rules)
    },
    devServer: {
        contentBase: '.'
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'style.css'
        }),
        //new CleanWebpackPlugin()
    ],
    mode: 'development'
};

module.exports = config;