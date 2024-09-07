// app/middleware/response_status.js

module.exports = () => {
  return async function (ctx, next) {
    await next();

    if (ctx.body && ctx.body.code) {
      const code = ctx.body.code;

      if (code === 201 || code === 202) {
        ctx.status = 200;
      } else {
        ctx.status = code;
      }
    }
  };
};
