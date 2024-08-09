// app/controller/auth/idaas/reset.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  token: 'string',
  password: 'string'
};

class AuthIdaasResetController extends Controller {
  /**
   * Idaas 修改密码
   */
  async index() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.request.body);
    const token = ctx.request.body.token;
    const password = ctx.request.body.password;
    try {
      const result = await ctx.curl(`${ctx.app.config.idaas.base}${ctx.app.config.idaas.reset}?token=${token}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        data: { password },
        dataType: 'json'
      });

      if (result.status === 200) {
        // 修改成功
        ctx.body = {
          code: 200,
          message: '统一身份认证密码修改成功'
        };
      } else if (result.data.errorCode === '200001009') {
        // 密码不可以与最近1个密码相同
        ctx.body = {
          code: 400,
          message: '密码不可以与最近1个密码相同'
        };
      } else {
        // 其他错误
        ctx.body = {
          code: 400,
          message: result.data.errorMsg
        };
      }
    } catch (err) {
      // 无法访问接口
      ctx.body = {
        code: 500,
        message: 'Idaas 重置密码接口请求失败'
      };
    }
  }
}

module.exports = AuthIdaasResetController;
