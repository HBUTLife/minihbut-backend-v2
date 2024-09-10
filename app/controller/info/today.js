// app/controller/info/today.js

const { Controller } = require('egg');
const dayjs = require('dayjs');

class InfoTodayController extends Controller {
  /**
   * 获取今日信息
   */
  async index() {
    const { ctx } = this;

    // 日期对象
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

      try {
        // 获取学期
        const query = await ctx.app.mysql.query(
          'SELECT * FROM term WHERE start_timestamp <= ? AND end_timestamp >= ?',
          [today_timestamp, today_timestamp]
        );

        let data;
        if (query.length > 0) {
          // 在学期内
          data = {
            term: query[0].name, // 学期
            total_weeks: query[0].total_weeks, // 学期总周数
            info: {
              date: today.format('YYYY-MM-DD'), // 日期
              week: Math.ceil((today_timestamp - query[0].start_timestamp) / (7 * 24 * 3600)), // 周次
              day: this.getTodayDay(today.day()) // 星期
            }
          };
        } else {
          // 不在学期内
          data = {
            total_weeks: 24, // 学期总周数，默认为 24
            info: {
              date: today.format('YYYY-MM-DD'), // 日期
              week: 1, // 周次，默认为 1
              day: this.getTodayDay(today.day()) // 星期
            }
          };
        }

        // 写入 Redis
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

  /**
   * 获取星期
   * @param {number} day 原始星期（0-6）
   * @return {number} 返回星期（1-7）
   */
  getTodayDay(day) {
    switch (day) {
      default:
        return day;
      case 0:
        return 7;
    }
  }
}

module.exports = InfoTodayController;
