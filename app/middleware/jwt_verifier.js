// app/middleware/jwt_verify.js

module.exports = () => {
  return async function (ctx, next) {
    const whitelist = ctx.app.config.whitelist;
    if (!whitelist.some(item => item === ctx.path)) {
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
