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
      const url = `${ctx.app.config.wechat.api_url}?appid=${ctx.app.config.wechat.app_id}&secret=${ctx.app.config.wechat.app_secret}&js_code=${js_code}&grant_type=authorization_code`;
      const result = await ctx.curl(url, {
        method: 'GET',
        dataType: 'json'
      });

      if(result.data.errcode === 0) {
        // 获取成功，保存至数据库进行绑定
        const hit = await ctx.app.mysql.update('user', {
          wx_openid: result.data.openid
        }, {
          where: {
            student_id: user.student_id
          }
        });

        if(hit.affectedRows === 1) {
          // 更新成功
          ctx.body = {
            code: 200,
            message: '微信绑定成功'
          };
        } else {
          // 更新失败
          ctx.body = {
            code: 500,
            message: '数据库更新失败，微信绑定失败'
          };
        }
      } else {
        // 获取失败
        ctx.body = {
          code: 401,
          message: '未能成功获取OpenID'
        };
      }
    } catch(err) {
      // 服务器连接微信接口失败
      ctx.body = {
        code: 500,
        message: '微信接口请求失败'
      };
    }
  }
}

module.exports = AuthWechatBindController;
