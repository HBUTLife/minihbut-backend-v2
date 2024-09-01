/* eslint valid-jsdoc: "off" */

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = (exports = {});

  // 中间件配置
  config.middleware = ['jwtVerifier', 'errorHandler'];

  // 安全设置
  config.security = {
    csrf: {
      enable: false // 关闭 csrf 检测
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
    classroom: '/admin/system/jxzy/jsxx/getZyKjs',
    upload: '/admin/system/attachment/upload',
    timetable: '/admin/pkgl/xskb/sdpkkbList',
    lesson: '/admin/jsd/qxzkb/querylist'
  };

  // idaas连接配置
  config.idaas = {
    base: 'https://idaas-idp.hbut.edu.cn',
    login: '/api/v1/idaas-idp.hbut.edu.cn/login',
    sso: '/sso/tn-b6844f43ad554d15aaa73f4ed4319a52/ai-4153833891724dbcb30dea72926feb37/cas?service=https%3A%2F%2Fjwxt.hbut.edu.cn%2Fadmin%2Fcaslogin%2Fgrkb',
    sms: '/api/v1/idaas-idp.hbut.edu.cn/forget_password/v2/sms',
    code: '/api/v1/idaas-idp.hbut.edu.cn/forget_password/v2/sms/token',
    reset: '/api/v1/idaas-idp.hbut.edu.cn/set_password'
  };

  // 小程序配置
  config.wechat = {
    app_id: 'wx42a9beac92f39a9a',
    app_secret: 'd1562932c12945fbfd02813c518f5092',
    api_url: 'https://api.weixin.qq.com/sns/jscode2session'
  };

  // 公共 jwt 配置
  config.jwt = {
    secret: 'qbiWBcUR9qEEnNLkoQ7Yk4ccpX6jcTuz',
    expiresIn: 365 * 86400
  };

  // 密码加密配置
  config.passkey = 'JGwjz4uunJDxbtcntZzaGm3mPukpnoHP';

  return {
    ...config
  };
};
