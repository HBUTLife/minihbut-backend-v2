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
      // 不存在缓存
      try {
        // 获取学期列表
        const query = await ctx.app.mysql.query(
          'SELECT name, start_date, start_timestamp, end_date, end_timestamp, total_weeks FROM term WHERE grade_enter >= ? ORDER BY id DESC',
          [parseInt(user.grade_enter)]
        );

        // 存入 Redis
        const cache_update = await ctx.app.redis.set(
          `info_term_${user.grade_enter}`,
          JSON.stringify(query),
          'EX',
          604800
        ); // 7 天过期

        if (cache_update === 'OK') {
          // 缓存成功
          ctx.body = {
            code: 200,
            message: '学期列表获取成功',
            data: query
          };
        } else {
          // 缓存失败
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

module.exports = InfoTermController;
