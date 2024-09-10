// app/controller/auth/wechat/bind.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  js_code: 'string'
};

class AuthWechatBindController extends Controller {
  /**
   * 微信绑定方法
   */
  async index() {
    const { ctx } = this;

    // 参数校验
    ctx.validate(createRule, ctx.request.body);

    // 获取参数
    const js_code = ctx.request.body.js_code;

    // 初始化个人信息
    const user = ctx.user_info;

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
        // 查看绑定情况
        const wx_openid = request.data.openid;
        try {
          const query = await ctx.app.mysql.select('user', { where: { wx_openid } });

          if (query.length === 0) {
            // 未绑定，进行绑定
            try {
              const update = await ctx.app.mysql.update(
                'user',
                { wx_openid: request.data.openid },
                { where: { student_id: user.student_id } }
              );

              if (update.affectedRows === 1) {
                // 绑定成功
                ctx.body = {
                  code: 200,
                  message: '微信绑定成功',
                  data: { wx_openid }
                };
              } else {
                // 绑定失败
                ctx.body = {
                  code: 404,
                  message: '用户不存在'
                };
              }
            } catch (err) {
              // 数据库更新失败
              ctx.logger.error(err);

              ctx.body = {
                code: 500,
                message: '服务器内部错误'
              };
            }
          } else {
            // 已绑定
            ctx.body = {
              code: 401,
              message: '该用户已绑定微信帐号，请先解绑后再次绑定'
            };
          }
        } catch (err) {
          // 数据库查询错误
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

module.exports = AuthWechatBindController;
