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
    // 数据库中获取绑定信息
    const result = await ctx.app.mysql.select('user', {
      where: {
        student_id: user.student_id
      }
    });
    let status;
    if (result[0].wx_openid) {
      // 已绑定
      status = true;
    } else {
      // 未绑定
      status = false;
    }

    ctx.body = {
      code: 200,
      message: '获取成功',
      data: {
        status
      }
    };
  }
}

module.exports = AuthWechatStatusController;
