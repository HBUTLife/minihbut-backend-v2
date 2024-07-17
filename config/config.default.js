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
  config.middleware = [ 'jwtVerifier', 'notfoundHandler', 'errorHandler' ];

  // 安全设置，关闭csrf检测
  config.security = {
    csrf: {
      enable: false
    }
  };

  // 教务系统连接配置
  config.jwxt = {
    base: 'https://jwxt.hbut.edu.cn',
    login: '/admin/login',
    info: '/admin/cjgl/xscjbbdy/printdgxscj',
    score: '/admin/xsd/xsdcjcx/xsdQueryXscjList',
    rank: '/admin/cjgl/xscjbbdy/getXscjpm',
    exam: '/admin/xsd/kwglXsdKscx/ajaxXsksList',
    classroom: '/admin/system/jxzy/jsxx/getZyKjs'
  };

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  };

  // 公共 jwt 配置
  config.jwt = {
    expiresIn: 365 * 86400 // 365天过期
  };

  // 小程序配置
  config.wx = {
    app_id: 'wx42a9beac92f39a9a',
    app_secret: 'd1562932c12945fbfd02813c518f5092',
    api_url: 'https://api.weixin.qq.com/sns/jscode2session'
  };

  // HttpClient 配置，防止教务系统相应过慢导致出错
  config.httpclient = {
    request: {
      timeout: 20000
    }
  };

  return {
    ...config,
    ...userConfig,
  };
};
