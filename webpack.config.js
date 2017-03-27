'use strict';

const path = require('path');
const cloneDeep = require('lodash.clonedeep');
const webpack = require("webpack");

const defaults = {
  context: path.resolve(__dirname, "src"),

  entry: "./tk-widget.js",

  output: {
    path: path.resolve(__dirname, "dist"),
    library: "tk",
    libraryTarget: "umd",
    filename: "tk-widget.bundle.js",
  },

  plugins : [],
};

var minified = cloneDeep(defaults);
minified.plugins.push(new webpack.optimize.UglifyJsPlugin());
minified.output.filename = "tk-widget.bundle.min.js";

module.exports = [defaults, minified];
