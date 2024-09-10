// app/controller/auth/wechat/login.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  js_code: 'string'
};

class AuthWechatLoginController extends Controller {
  /**
   * 微信登录方法
   */
  async index() {
    const { ctx } = this;

    // 参数校验
    ctx.validate(createRule, ctx.request.body);

    // 获取参数
    const js_code = ctx.request.body.js_code;

    try {
      // 请求微信接口
      const request = await ctx.curl(ctx.app.config.wechat.base + ctx.app.config.wechat.url.jscode2session, {
        method: 'GET',
        data: {
          appid: ctx.app.config.wechat.appId,
          secret: ctx.app.config.wechat.appSecret,
          js_code,
          grant_type: 'authorization_code'
        },
        dataType: 'json'
      });

      // 不返回 errcode 则成功
      if (!request.data.errcode) {
        try {
          // 获取成功，与数据库内数据进行比对
          const query = await ctx.app.mysql.select('user', {
            where: {
              wx_openid: request.data.openid
            }
          });

          if (query.length > 0) {
            // 有绑定用户，进行登录
            const info = ctx.service.auth.parseUserInfo(query[0]);

            ctx.body = {
              code: 200,
              message: '微信登录成功',
              data: {
                info,
                token: ctx.service.auth.signToken(info)
              }
            };
          } else {
            // 未绑定用户，返回信息
            ctx.body = {
              code: 404,
              message: '该微信帐号未绑定用户'
            };
          }
        } catch (err) {
          // 数据库比对失败
          ctx.logger.error(err);

          ctx.body = {
            code: 500,
            message: '服务器内部错误'
          };
        }
      } else {
        // 微信接口报错
        ctx.body = {
          code: 400,
          message: request.data.errmsg
        };
      }
    } catch (err) {
      // 服务器连接微信接口失败
      ctx.logger.error(err);

      ctx.body = {
        code: 503,
        message: '微信服务端接口请求失败'
      };
    }
  }
}

module.exports = AuthWechatLoginController;
