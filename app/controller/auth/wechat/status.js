// app/controller/auth/wechat/status.js

const { Controller } = require('egg');

class AuthWechatStatusController extends Controller {
  /**
   * 获取绑定状态
   */
  async index() {
    const { ctx } = this;

    // 初始化个人信息
    const user = ctx.user_info;

    try {
      // 查询数据库，获取绑定信息
      const query = await ctx.app.mysql.select('user', {
        where: {
          student_id: user.student_id
        }
      });

      ctx.body = {
        code: 200,
        message: '微信绑定状态获取成功',
        data: {
          status: !!query[0].wx_openid
        }
      };
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

module.exports = AuthWechatStatusController;
