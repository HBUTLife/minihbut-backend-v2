// app/controller/info/term.js

const { Controller } = require('egg');

class InfoTermController extends Controller {
  /**
   * 获取学期列表方法
   */
  async index() {
    const { ctx } = this;
    // 初始化个人信息
    const user = ctx.user_info;
    // Redis 获取个人学期缓存
    const cache = await ctx.app.redis.get(`info_term_${user.grade_enter}`);
    if (cache) {
      // 存在缓存
      ctx.body = {
        code: 201,
        message: '学期列表获取成功',
        data: JSON.parse(cache)
      };
    } else {
      // 不存在缓存，从数据库中获取
      const mysql = await ctx.app.mysql.query(
        'SELECT name, start_date, start_timestamp, end_date, end_timestamp, total_weeks FROM term WHERE grade_enter >= ? ORDER BY id DESC',
        [parseInt(user.grade_enter)]
      );
      // 存入 Redis
      const cache_update = await ctx.app.redis.set(
        `info_term_${user.grade_enter}`,
        JSON.stringify(mysql),
        'EX',
        604800
      ); // 7 天过期
      if (cache_update === 'OK') {
        // 缓存成功
        ctx.body = {
          code: 200,
          message: '学期列表获取成功',
          data: mysql
        };
      } else {
        // 缓存失败
        ctx.body = {
          code: 500,
          message: '学期列表缓存失败'
        };
      }
    }
  }
}

module.exports = InfoTermController;
