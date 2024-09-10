// app/controller/auth/wechat/unbind.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  js_code: 'string'
};

class AuthWechatUnbindController extends Controller {
  /**
   * 微信解绑方法
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
      // 查询数据库，获取绑定信息
      const query = await ctx.app.mysql.select('user', { where: { student_id: user.student_id } });

      if (query.length > 0) {
        // 有绑定记录，检查 wx_openid 是否一致

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
          if (!request.data.errcode && request.data.openid === query[0].wx_openid) {
            // wx_openid 一致，可以解绑
            try {
              const update = await ctx.app.mysql.update(
                'user',
                { wx_openid: '' },
                { where: { student_id: user.student_id } }
              );

              if (update.affectedRows === 1) {
                // 更新成功
                ctx.body = {
                  code: 200,
                  message: '微信解绑成功',
                  data: {
                    wx_openid: request.data.openid
                  }
                };
              } else {
                // 更新失败
                ctx.body = {
                  code: 500,
                  message: '服务器内部错误'
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
          } else if (!request.data.errcode && request.data.openid !== query[0].wx_openid) {
            // wx_openid 不一致，不允许解绑
            ctx.body = {
              code: 401,
              message:
                '该用户绑定的微信帐号与目前登录的微信帐号不一致，请登录原来绑定的微信帐号进行解绑，或联系开发者解绑'
            };
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
    } catch (err) {
      // 数据库查询失败
      ctx.logger.error(err);

      ctx.body = {
        code: 500,
        message: '服务器内部错误'
      };
    }
  }
}

module.exports = AuthWechatUnbindController;
