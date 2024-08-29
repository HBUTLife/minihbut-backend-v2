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
    const username = ctx.request.body.username;
    const code = ctx.request.body.code;
    try {
      const result = await ctx.curl(ctx.app.config.idaas.base + ctx.app.config.idaas.code, {
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

      console.log(result);

      if (result.status === 200) {
        // 成功
        ctx.body = {
          code: 200,
          message: '短信验证成功',
          data: {
            username: result.data.params.username,
            token: result.data.params.token
          }
        };
      } else {
        // 失败
        ctx.body = {
          code: 401,
          message: '验证码不正确'
        };
      }
    } catch (err) {
      // 无法访问
      ctx.body = {
        code: 500,
        message: '统一身份认证短信验证接口请求失败'
      };
    }
  }
}

module.exports = AuthIdaasForgetCodeController;
