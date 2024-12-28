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
    // base: 'https://devapi.qweather.com', // 免费接口地址
    // key: 'c406bedc167d4c28837effa09d4efea5' // 免费 Key
    base: 'https://api.qweather.com', // 付费接口地址
    url: {
      now: '/v7/weather/now' // 实时天气
    },
    iconUrl: 'https://wx-mini-program-kjdueh.qweather.net/sites/mini-program/v1/icon',
    key: 'aa5bc22d1a894af1a230918b04ddba15', // 官方 Key
    location: '101200113' // 默认位置 湖北省武汉市洪山区
  };

  // 小程序配置
  config.wechat = {
    base: 'https://api.weixin.qq.com',
    url: {
      jscode2session: '/sns/jscode2session' // 小程序登录
    },
    appId: 'wx42a9beac92f39a9a', // 小程序 appId
    appSecret: 'd1562932c12945fbfd02813c518f5092' // 小程序 appSecret
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

  // OSS 配置
  config.oss = {
    host: 'https://image-souta.oss-cn-shanghai.aliyuncs.com',
    accessKeyId: 'LTAI5tCv5TM9stprAp96Sq56',
    accessKeySecret: 'DKPfiGvyGobVvUcYqVtWonJMxxCS2D', // 密钥仅用于上传文件
    conditions: [
      { bucket: 'image-souta' }, // 桶名称
      ['content-length-range', 0, 2097152], // 上传文件最大为 2 MB
      ['eq', '$success_action_status', '200'] // 设置成功返回 200
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
