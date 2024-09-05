// app/controller/statistic/detail.js

const { Controller } = require('egg');
const cryptojs = require('crypto-js');
const dayjs = require('dayjs');

// 定义创建接口的请求参数规则
const createRule = {
  name: 'string',
  teacher: 'string'
};

class StatisticDetailController extends Controller {
  /**
   * 给分统计详情查询方法
   */
  async index() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.query);
    // 获取参数
    const name = ctx.query.name;
    const teacher = ctx.query.teacher;
    // Redis Key
    const md5 = cryptojs.MD5(`${ctx.query.name}_${ctx.query.teacher}`).toString();
    const cache_key = `statistic_detail_${md5}`;
    // Redis 获取给分统计详情缓存
    const cache = await ctx.app.redis.get(cache_key);
    if (cache) {
      // 存在缓存
      ctx.body = {
        code: 201,
        message: '给分统计详情获取成功',
        data: JSON.parse(cache)
      };
    } else {
      // 不存在缓存，则更新
      const result = await this.app.mysql.select('score', {
        where: {
          name,
          teacher
        },
        orders: [['score', 'desc']]
      });
      const total_number = result.length; // 样本总量
      // 样本量少于30不予展示
      if (total_number < 30) {
        this.ctx.body = {
          code: 416,
          message: '给分统计样本量少于30'
        };
        return;
      }
      // 变量定义
      let section1 = 0; // 90分以上计数
      let section2 = 0; // 80-90分计数
      let section3 = 0; // 70-80分计数
      let section4 = 0; // 60-70分计数
      let section5 = 0; // 60分以下计数
      let total_score = 0; // 总分
      // 遍历循环成绩并统计数量
      for (const item of result) {
        const score = item.score;
        if (score >= 90) {
          section1++;
        } else if (score < 90 && score >= 80) {
          section2++;
        } else if (score < 80 && score >= 70) {
          section3++;
        } else if (score < 70 && score >= 60) {
          section4++;
        } else {
          section5++;
        }
        total_score = total_score + score;
      }
      // 输出
      const output = {
        total_number, // 样本量
        highest_score: result[0].score, // 最高分
        average_score: (total_score / total_number).toFixed(2), // 平均分，保留2位小数
        up_90: ((section1 / total_number) * 100).toFixed(2).toString() + '%', // 90分以上比例
        between_80_90: ((section2 / total_number) * 100).toFixed(2).toString() + '%', // 80-90分比例
        between_70_80: ((section3 / total_number) * 100).toFixed(2).toString() + '%', // 70-80分比例
        between_60_70: ((section4 / total_number) * 100).toFixed(2).toString() + '%', // 60-70分比例
        down_60: ((section5 / total_number) * 100).toFixed(2).toString() + '%', // 60分以下比例
        last_update: dayjs().unix() // 最后更新时间
      };
      // 存入 Redis
      const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(output), 'EX', 3600); // 1 小时过期
      if (cache_update === 'OK') {
        // 更新成功
        ctx.body = {
          code: 200,
          message: '给分统计详情获取成功',
          data: output
        };
      } else {
        // 更新失败
        ctx.body = {
          code: 500,
          message: '给分统计详情缓存更新失败'
        };
      }
    }
  }
}

module.exports = StatisticDetailController;
