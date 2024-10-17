// app/controller/auth/idaas/forget/reset.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  token: 'string',
  password: 'string'
};

class AuthIdaasForgetResetController extends Controller {
  /**
   * 统一身份认证密码重置
   */
  async index() {
    const { ctx } = this;

    // 参数校验
    ctx.validate(createRule, ctx.request.body);

    // 获取参数
    const token = ctx.request.body.token;
    const password = ctx.request.body.password;

    try {
      // 请求统一身份认证密码重置接口
      const request = await ctx.curl(`${ctx.app.config.idaas.base}${ctx.app.config.idaas.forgetReset}?token=${token}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        data: { password },
        dataType: 'json'
      });

      if (request.status === 200) {
        // 修改成功
        ctx.body = {
          code: 200,
          message: '统一身份认证密码重置成功'
        };
      } else if (request.data.details.policy === 'usedRecord') {
        // 密码使用过问题
        ctx.body = {
          code: 400,
          message: '密码不可以与最近1个密码相同'
        };
      } else if (request.data.details.policy === 'passwordLength') {
        // 密码长度问题
        ctx.body = {
          code: 400,
          message: `密码长度必须为${request.data.details.min}-${request.data.details.max}位字符`
        };
      } else if (request.data.details.policy === 'uppercase') {
        // 密码大写字符问题
        ctx.body = {
          code: 400,
          message: `密码必须包含${request.data.details.min}位大写英文字母`
        };
      } else if (request.data.details.policy === 'email') {
        // 邮箱前缀问题
        ctx.body = {
          code: 400,
          message: '密码不允许包含主邮箱前缀内容'
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

module.exports = AuthIdaasForgetResetController;
