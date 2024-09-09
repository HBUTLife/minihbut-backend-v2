// app/controller/user/info.js

const { Controller } = require('egg');

class UserInfoController extends Controller {
  /**
   * 用户信息
   */
  async index() {
    const { ctx } = this;

    // 初始化个人信息
    const user = ctx.user_info;

    // 获取用户信息
    const result = await ctx.app.mysql.select('user', { where: { student_id: user.student_id } });

    // 如果没有用户信息
    if (result.length === 0) {
      ctx.body = {
        code: 404,
        message: '用户不存在'
      };
      return;
    }

    // 有用户信息
    const data = result[0];
    delete data.password;
    delete data.jw_id;
    delete data.jw_uid;
    delete data.jw_route;
    delete data.wx_openid;
    delete data.create_time;
    delete data.update_time;

    ctx.body = {
      code: 200,
      message: '用户信息获取成功',
      data
    };
  }
}

module.exports = UserInfoController;
