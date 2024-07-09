/* eslint valid-jsdoc: "off" */

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1720548611153_1955';

  // add your middleware config here
  config.middleware = [ 'notfoundHandler', 'errorHandler' ];

  config.security = {
    csrf: {
      enable: false
    }
  };

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  };

  // 公共jwt配置
  config.jwt = {
    expiresIn: 365 * 86400 // 365天过期
  };

  // HttpClient配置
  config.httpclient = {
    request: {
      timeout: 10000
    }
  };

  return {
    ...config,
    ...userConfig,
  };
};
