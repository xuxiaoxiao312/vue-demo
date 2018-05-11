var HelloWorldPlugin = require("./hello-world");

// vue.config.js
module.exports = {
  lintOnSave: false,
  configureWebpack: {
    plugins: [new HelloWorldPlugin()]
  }
};
