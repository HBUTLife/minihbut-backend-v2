// app/controller/statistic/search.js

const { Controller } = require('egg');
const cryptojs = require('crypto-js');

// 定义创建接口的请求参数规则
const createRule = {
  keyword: 'string'
};

class StatisticSearchController extends Controller {
  /**
   * 给分统计查询方法
   */
  async index() {
    const { ctx } = this;

    // 参数校验
    ctx.validate(createRule, ctx.query);

    // 获取关键词
    const keyword = ctx.query.keyword;

    // 字符必须大于等于2
    if (keyword.length < 2) {
      ctx.body = {
        code: 403,
        message: '搜索字符必须大于等于2'
      };
      return;
    }

    const cache_key = `statistic_search_${cryptojs.MD5(keyword).toString()}`;

    // Redis 获取给分统计搜索缓存
    const cache = await ctx.app.redis.get(cache_key);

    if (cache) {
      // 存在缓存
      ctx.body = {
        code: 201,
        message: '给分统计搜索成功',
        data: JSON.parse(cache)
      };
    } else {
      // 不存在缓存，则通过数据库查询
      const result = await this.app.mysql.query(
        'SELECT DISTINCT name, teacher FROM score WHERE (name LIKE ? OR teacher LIKE ?) AND teacher IS NOT NULL',
        [`%${keyword}%`, `%${keyword}%`]
      );

      if (result.length > 0) {
        // 有结果，存入 Redis
        const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(result), 'EX', 3600); // 1 小时过期

        if (cache_update === 'OK') {
          // 更新成功
          ctx.body = {
            code: 200,
            message: '给分统计搜索成功',
            data: result
          };
        } else {
          // 更新失败
          ctx.body = {
            code: 500,
            message: '给分统计搜索缓存更新失败'
          };
        }
      } else {
        // 无结果
        ctx.body = {
          code: 200,
          message: '给分统计搜索成功',
          data: []
        };
      }
    }
  }
}

module.exports = StatisticSearchController;
