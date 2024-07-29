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
    const cache = await ctx.app.redis.get(`term_${user.student_id}`);
    if (cache) {
      // 存在缓存
      ctx.body = {
        code: 201,
        message: '学期列表获取成功',
        data: JSON.parse(cache)
      };
    } else {
      // 不存在缓存，从数据库中获取
      const mysql = await ctx.app.mysql.select('term', { orders: [['id', 'desc']] });
      // 获取成功，根据用户入学年级进行处理
      const term_list = [];
      for (const item of mysql) {
        const start = parseInt(item.name.split('-')[0]);
        if (start >= user.grade_enter) {
          term_list.push(item);
        }
      }
      // 存入 Redis
      const cache_hit = await ctx.app.redis.set(`term_${user.student_id}`, JSON.stringify(term_list), 'EX', 604800); // 7 天过期
      if (cache_hit === 'OK') {
        // 缓存成功
        ctx.body = {
          code: 200,
          message: '学期列表获取成功',
          data: term_list
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
