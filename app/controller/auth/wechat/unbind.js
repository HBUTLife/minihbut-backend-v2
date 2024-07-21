// app/controller/auth/wechat/unbind.js

const { Controller } = require('egg');

class AuthWechatUnbindController extends Controller {
  /**
   * 微信解绑方法
   */
  async index() {
    const { ctx } = this;
    // 初始化个人信息
    const user = ctx.user_info;
    // 更新数据库
    const hit = await ctx.app.mysql.update('user', {
      wx_openid: ''
    }, {
      where: {
        student_id: user.student_id
      }
    });

    if(hit.affectedRows === 1) {
      // 解绑成功
      ctx.body = {
        code: 200,
        message: '微信解绑成功'
      };
    } else {
      // 解绑失败，数据库更新错误
      ctx.body = {
        code: 500,
        message: '数据库更新失败，微信解绑失败'
      };
    }
  }
}

module.exports = AuthWechatUnbindController;
