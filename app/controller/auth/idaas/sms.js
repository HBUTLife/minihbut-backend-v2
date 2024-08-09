// app/controller/auth/idaas/sms.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  username: 'string'
};

class AuthIdaasSmsController extends Controller {
  /**
   * Idaas 发送短信
   */
  async index() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.request.body);
    const username = ctx.request.body.username;
    try {
      // 请求短信接口
      const result = await ctx.curl(ctx.app.config.idaas.base + ctx.app.config.idaas.sms, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        data: { username },
        dataType: 'json'
      });

      const data = result.data;

      if (data.errorCode === '200003002') {
        // 账号不存在
        ctx.body = {
          code: 404,
          message: '账号不存在'
        };
        return;
      }

      if (data.type === 'SMS') {
        // 发送成功
        ctx.body = {
          code: 200,
          message: '短信发送成功',
          data: {
            username: data.params.username, // 用户名
            mobile: data.params.mobile, // 手机号
            expiresIn: data.params.expiresIn // 过期时间
          }
        };
      } else {
        // 其他错误
        ctx.body = {
          code: 500,
          message: 'Idaas 发生其他错误'
        };
      }
    } catch (err) {
      // 无法访问
      ctx.body = {
        code: 500,
        message: 'Idaas 短信接口请求失败'
      };
    }
  }
}

module.exports = AuthIdaasSmsController;
