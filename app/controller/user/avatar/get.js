// app/controller/user/avatar/get.js

const { Controller } = require('egg');

class UserAvatarGetController extends Controller {
  /**
   * 获取头像
   */
  async index() {
    const { ctx } = this;

    // 初始化个人信息
    const user = ctx.user_info;

    // 获取头像
    const hit = await ctx.app.mysql.select('user', { where: { student_id: user.student_id } });

    if (hit.length > 0) {
      // 获取成功
      ctx.body = {
        code: 200,
        message: '头像获取成功',
        data: {
          avatar: hit[0].avatar
        }
      };
    } else {
      // 获取失败
      ctx.body = {
        code: 500,
        message: '头像获取失败'
      };
    }
  }
}

module.exports = UserAvatarGetController;
