const path = require("path");
const VueLoaderPlugin = require("vue-loader/lib/plugin");

module.exports = {
    entry: "./src/renderer/index.ts",
    output: {
        path: path.resolve(__dirname, "lib", "renderer"),
        filename: "bundle.js",
        publicPath: __dirname.replace(/\\/g, "/") + "/lib/renderer/"
    },
    resolve: {
        extensions: ['.js', '.ts', '.vue']
    },
    module: {
        rules: [
            {
                test: /\.vue$/,
                loader: "vue-loader"
            },
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                options: {
                    appendTsSuffixTo: [/\.vue$/]
                }
            },
            {
                test: /\.(gif|png|jpe?g|svg)$/i,
                loader: "file-loader",
                options: {
                    name: '[name].[ext]?[hash]'
                }
            },
            {
                test: /\.css$/,
                use: [
                    "vue-style-loader",
                    "css-loader"
                ]
            },
            {
                test: /\.scss$/,
                use: [
                    "vue-style-loader",
                    "css-loader",
                    "sass-loader"
                ]
            }
        ]
    },
    plugins: [
        new VueLoaderPlugin()
    ],
    node: {
        fs: 'empty',
    },
    target: "electron-renderer",
    devtool: "source-map"
};
