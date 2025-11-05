/* eslint valid-jsdoc: "off" */

module.exports = () => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = (exports = {});

  // 中间件配置
  config.middleware = ['responseStatus', 'jwtVerifier', 'errorHandler'];

  // 安全设置
  config.security = {
    csrf: {
      enable: false // 关闭 csrf 检测
    }
  };

  // 教务系统接口配置
  config.jwxt = {
    base: 'https://jwxt.hbut.edu.cn',
    url: {
      info: '/admin/cjgl/xscjbbdy/printdgxscj', // 用户信息
      score: '/admin/xsd/xsdcjcx/xsdQueryXscjList', // 成绩信息
      rank: '/admin/cjgl/xscjbbdy/getXscjpm', // 排名信息
      exam: '/admin/xsd/kwglXsdKscx/ajaxXsksList', // 考试信息
      classroom: '/admin/system/jxzy/jsxx/getZyKjs', // 空教室
      timetable: '/admin/pkgl/xskb/sdpkkbList', // 课表信息
      lesson: '/admin/jsd/qxzkb/querylist' // 全校课表信息
    }
  };

  // 统一身份认证接口配置
  config.idaas = {
    base: 'https://idaas-idp.hbut.edu.cn',
    login: '/api/v1/idaas-idp.hbut.edu.cn/login', // 登录
    sso: '/sso/tn-b6844f43ad554d15aaa73f4ed4319a52/ai-4153833891724dbcb30dea72926feb37/cas?service=https%3A%2F%2Fjwxt.hbut.edu.cn%2Fadmin%2Fcaslogin%2Fgrkb', // 单点验证
    forgetCheck: '/api/v1/idaas-idp.hbut.edu.cn/forget_password/v2', // 用户状态检测
    forgetSms: '/api/v1/idaas-idp.hbut.edu.cn/forget_password/v2/sms', // 忘记密码发送短信
    forgetCode: '/api/v1/idaas-idp.hbut.edu.cn/forget_password/v2/sms/token', // 忘记密码验证码检测
    forgetReset: '/api/v1/idaas-idp.hbut.edu.cn/set_password' // 设置密码
  };

  // 和风天气接口配置
  config.qweather = {
    base: 'https://devapi.qweather.com',
    key: '',
    url: {
      now: '/v7/weather/now' // 实时天气
    },
    iconUrl: 'https://wx-mini-program-kjdueh.qweather.net/sites/mini-program/v1/icon',
    location: '101200113' // 默认位置 湖北省武汉市洪山区
  };

  // 小程序配置
  config.wechat = {
    base: 'https://api.weixin.qq.com',
    url: {
      jscode2session: '/sns/jscode2session' // 小程序登录
    },
    appId: '', // 小程序 appId
    appSecret: '' // 小程序 appSecret
  };

  // 公共 jwt 配置
  config.jwt = {
    secret: '', // jwt 服务端私钥
    expiresIn: 365 * 86400 // token 过期时间 365 天
  };

  // 用户密码加密配置
  config.encryption = {
    secret: '' // 服务端私钥
  };

  // OSS 配置
  config.oss = {
    host: '',
    cdn: '',
    accessKeyId: '',
    accessKeySecret: '', // 密钥仅用于上传文件
    conditions: [
      { bucket: '' }, // 桶名称
      ['content-length-range', 0, 2097152], // 上传文件最大为 2 MB
      ['in', '$content-type', ['image/jpeg', 'image/png']] // 上传文件类型为 JPG JPEG PNG
    ]
  };

  // 无需鉴权的接口
  config.whitelist = [
    '/auth/idaas/login',
    '/auth/idaas/forget/sms',
    '/auth/idaas/forget/code',
    '/auth/idaas/forget/reset',
    '/auth/wechat/login',
    '/timetable/person/ics',
    '/info/swiper',
    '/info/swiper/click',
    '/info/urgent',
    '/info/weather',
    '/info/miniprogram'
  ];

  // 日志配置
  config.logger = {
    outputJSON: true
  };

  return {
    ...config
  };
};
