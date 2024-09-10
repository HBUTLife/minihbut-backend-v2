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
      // 不存在缓存
      try {
        // 获取用户信息
        const query = await ctx.app.mysql.select('user', { where: { student_id: user.student_id } });

        // 如果没有用户信息
        if (query.length === 0) {
          ctx.body = {
            code: 404,
            message: '用户不存在'
          };
          return;
        }

        // 有用户信息
        const info = ctx.service.auth.parseUserInfo(query[0]);

        // 写入缓存
        const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(info), 'EX', 86400); // 缓存 24 小时

        if (cache_update) {
          // 写入成功
          ctx.body = {
            code: 200,
            message: '用户信息获取成功',
            data: info
          };
        } else {
          // 写入失败
          ctx.body = {
            code: 500,
            message: '服务器内部错误'
          };
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
}

module.exports = UserInfoController;
