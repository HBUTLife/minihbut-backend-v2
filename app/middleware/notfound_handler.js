// app/middleware/notfound_handler.js

module.exports = () => {
  return async function notfoundHandler(ctx, next) {
    await next();
    if(ctx.status === 404) {
      ctx.body = {
        code: 404,
        message: 'Not Found'
      };
    }
  };
};