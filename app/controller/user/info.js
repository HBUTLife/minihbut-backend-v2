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

    // Redis Key
    const cache_key = `user_info_${user.student_id}`;

    // 从缓存中获取
    const cache = await ctx.app.redis.get(cache_key);

    if (cache) {
      // 缓存存在
      ctx.body = {
        code: 201,
        message: '用户信息获取成功',
        data: JSON.parse(cache)
      };
    } else {
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

      // 写入缓存
      const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(data), 'EX', 86400); // 缓存 24 小时

      if (cache_update) {
        // 写入成功
        ctx.body = {
          code: 200,
          message: '用户信息获取成功',
          data
        };
      } else {
        // 写入失败
        ctx.body = {
          code: 500,
          message: '用户信息缓存失败'
        };
      }
    }
  }
}

module.exports = UserInfoController;
