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

  // 教务系统接口配置
  config.jwxt = {
    base: 'https://jwxt.hbut.edu.cn',
    info: '/admin/cjgl/xscjbbdy/printdgxscj', // 用户信息
    score: '/admin/xsd/xsdcjcx/xsdQueryXscjList', // 成绩信息
    rank: '/admin/cjgl/xscjbbdy/getXscjpm', // 排名信息
    exam: '/admin/xsd/kwglXsdKscx/ajaxXsksList', // 考试信息
    classroom: '/admin/system/jxzy/jsxx/getZyKjs', // 空教室
    timetable: '/admin/pkgl/xskb/sdpkkbList', // 课表信息
    lesson: '/admin/jsd/qxzkb/querylist' // 全校课表信息
  };

  // 统一身份认证接口配置
  config.idaas = {
    base: 'https://idaas-idp.hbut.edu.cn',
    login: '/api/v1/idaas-idp.hbut.edu.cn/login', // 登录
    sso: '/sso/tn-b6844f43ad554d15aaa73f4ed4319a52/ai-4153833891724dbcb30dea72926feb37/cas?service=https%3A%2F%2Fjwxt.hbut.edu.cn%2Fadmin%2Fcaslogin%2Fgrkb', // 单点验证
    sms: '/api/v1/idaas-idp.hbut.edu.cn/forget_password/v2/sms', // 短信发送
    code: '/api/v1/idaas-idp.hbut.edu.cn/forget_password/v2/sms/token', // 验证码检测
    reset: '/api/v1/idaas-idp.hbut.edu.cn/set_password' // 设置密码
  };

  // 腾讯位置服务接口配置
  config.lbs = {
    base: 'https://apis.map.qq.com',
    weather: '/ws/weather/v1', // 天气服务 (10000 QPS/day, 5 QPS/second)
    ip: '/ws/location/v1/ip', // IP 定位服务 (10000 QPS/day, 5 QPS/second)
    key: 'SQVBZ-XXSK4-ZGAUF-KIJTU-A4PVS-6UFBW' // 腾讯位置服务 Key
  };

  // 小程序配置
  config.wechat = {
    app_id: 'wx42a9beac92f39a9a',
    app_secret: 'd1562932c12945fbfd02813c518f5092',
    api_url: 'https://api.weixin.qq.com/sns/jscode2session'
  };

  // 公共 jwt 配置
  config.jwt = {
    secret: 'qbiWBcUR9qEEnNLkoQ7Yk4ccpX6jcTuz', // jwt 服务端私钥
    expiresIn: 365 * 86400 // token 过期时间 365 天
  };

  // 用户密码加密配置
  config.encryption = {
    secret: 'JGwjz4uunJDxbtcntZzaGm3mPukpnoHP' // 服务端私钥
  };

  // 上传文件配置
  config.multipart = {
    fileSize: '5mb',
    mode: 'stream',
    fileExtensions: ['.png', '.jpg', '.jpeg', '.bmp', '.webp']
  };

  return {
    ...config
  };
};
