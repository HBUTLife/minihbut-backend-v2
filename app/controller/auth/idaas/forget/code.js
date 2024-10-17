// app/controller/auth/idaas/forget/code.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  username: 'string',
  code: 'string'
};

class AuthIdaasForgetCodeController extends Controller {
  /**
   * 验证码检验
   */
  async index() {
    const { ctx } = this;

    // 参数校验
    ctx.validate(createRule, ctx.request.body);

    // 获取参数
    const username = ctx.request.body.username;
    const code = ctx.request.body.code;

    try {
      // 请求统一身份认证验证码检验接口
      const request = await ctx.curl(ctx.app.config.idaas.base + ctx.app.config.idaas.forgetCode, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        data: {
          username,
          code
        },
        dataType: 'json'
      });

      if (request.status === 200) {
        // 验证码正确
        ctx.body = {
          code: 200,
          message: '短信验证成功',
          data: {
            username: request.data.params.username,
            token: request.data.params.token
          }
        };
      } else if (request.status === 401) {
        // 验证码错误
        ctx.body = {
          code: 401,
          message: '验证码不正确'
        };
      } else {
        // 统一身份认证接口其他错误
        ctx.body = {
          code: 400,
          message: request.data.errorMsg
        };
      }
    } catch (err) {
      // 统一身份认证接口请求失败
      ctx.logger.error(err);

      ctx.body = {
        code: 503,
        message: '统一身份认证接口请求失败'
      };
    }
  }
}

module.exports = AuthIdaasForgetCodeController;
