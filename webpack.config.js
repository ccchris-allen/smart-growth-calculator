var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

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
        filename: './dist/bundle.js'
    },
    devtool: 'source-map',
    module: {
        // Note: Use 'rules' rather than 'loaders' (which is deprecated)
        rules: [
            {
                test: /\.(s*)css$/,
                use: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: ['css-loader', 'sass-loader']
                })
            }
        ].concat(optional_rules)
    },
    plugins: [
        new ExtractTextPlugin({filename: 'dist/style.css'})
    ]
};

module.exports = config;
