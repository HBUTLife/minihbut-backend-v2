// app/middleware/response_status.js

module.exports = () => {
  return async function (ctx, next) {
    await next();
    if (ctx.body && ctx.body.code) {
      ctx.status = ctx.body.code;
    }
  };
};
