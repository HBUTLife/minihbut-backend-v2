// app/controller/auth/idaas/forget/sms.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  username: 'string'
};

class AuthIdaasForgetSmsController extends Controller {
  /**
   * 统一身份认证发送短信
   */
  async index() {
    const { ctx } = this;

    // 参数校验
    ctx.validate(createRule, ctx.request.body);

    // 获取参数
    const username = ctx.request.body.username;

    try {
      // 请求统一身份认证用户状态检测接口
      const request = await ctx.curl(ctx.app.config.idaas.base + ctx.app.config.idaas.check, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        data: {
          username
        },
        dataType: 'json'
      });

      if (request.status === 200 && !request.data.errCode) {
        // 帐号状态正常，请求验证码
        try {
          // 请求统一身份认证发送短信接口
          const request = await ctx.curl(ctx.app.config.idaas.base + ctx.app.config.idaas.sms, {
            method: 'POST',
            headers: {
              'content-type': 'application/json'
            },
            data: { username },
            dataType: 'json'
          });

          // 账号不存在
          if (request.data.errorCode === '200003002') {
            ctx.body = {
              code: 404,
              message: '账号不存在'
            };
            return;
          }

          if (request.data.type === 'SMS') {
            // 发送成功
            ctx.body = {
              code: 200,
              message: '短信发送成功',
              data: {
                username: request.data.params.username, // 用户名
                mobile: request.data.params.mobile, // 手机号
                expiresIn: request.data.params.expiresIn // 过期时间
              }
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
      } else if (request.data.errCode === '200003002') {
        // 帐号不存在
        ctx.body = {
          code: 404,
          message: '帐号不存在'
        };
      } else if (request.data.errCode === '200003003') {
        // 帐号状态异常，需要解除
        ctx.body = {
          code: 400,
          message: '帐号状态异常，请前往融合门户自助解锁'
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

module.exports = AuthIdaasForgetSmsController;
