// app/middleware/jwt_verify.js

// 白名单，过滤不需要鉴权的接口
const white_list = [
  '/',
  '/auth/idaas/login',
  '/auth/idaas/forget/sms',
  '/auth/idaas/forget/code',
  '/auth/idaas/forget/reset',
  '/auth/wechat/login',
  '/info/weather',
  '/info/other',
  '/info/article',
  '/timetable/person/ics'
];

module.exports = () => {
  return async function (ctx, next) {
    if (!white_list.some(item => item === ctx.path)) {
      const token = ctx.request.header.authorization;
      if (token && token !== 'null') {
        try {
          const decode = ctx.app.jwt.verify(token, ctx.app.config.jwt.secret);
          ctx.user_info = decode;
          await next();
        } catch (err) {
          ctx.body = {
            code: 401,
            message: 'token已过期'
          };
        }
      } else {
        ctx.body = {
          code: 401,
          message: '缺少token'
        };
      }
    } else {
      await next();
    }
  };
};
