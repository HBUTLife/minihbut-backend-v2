// app/controller/info/today.js

const { Controller } = require('egg');
const dayjs = require('dayjs');

class InfoTodayController extends Controller {
  /**
   * 获取今日信息
   */
  async index() {
    const { ctx } = this;
    const today = dayjs();
    // Redis Key
    const cache_key = `info_today_${today.format('YYYY-MM-DD')}`;
    // Redis 获取今日数据
    const cache = await ctx.app.redis.get(cache_key);
    if (cache) {
      // 存在缓存
      ctx.body = {
        code: 201,
        message: '今日信息获取成功',
        data: JSON.parse(cache)
      };
    } else {
      // 不存在缓存
      const today_timestamp = today.unix();
      const terms = await ctx.app.mysql.query('SELECT * FROM term WHERE start_timestamp >= ? AND end_timestamp <= ?', [
        today_timestamp,
        today_timestamp
      ]);
      let data;
      if (terms.length > 0) {
        // 在学期内
        data = {
          term: terms[0].name, // 学期
          info: {
            date: today.format('YYYY-MM-DD'), // 日期
            week: Math.ceil((today_timestamp - terms[0].start_timestamp) / (7 * 24 * 3600)), // 周次
            day: today.day() + 1 // 星期
          }
        };
      } else {
        // 不在学期内
        data = {
          term: '',
          info: {
            date: today.format('YYYY-MM-DD'), // 日期
            week: 1, // 周次，默认为 1
            day: today.day() // 星期
          }
        };
      }
      const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(data), 'EX', 3600); // 1 小时过期
      if (cache_update === 'OK') {
        // 更新成功
        ctx.body = {
          code: 200,
          message: '今日信息获取成功',
          data
        };
      } else {
        // 更新失败
        ctx.body = {
          code: 500,
          message: '今日信息缓存更新失败'
        };
      }
    }
  }
}

module.exports = InfoTodayController;
