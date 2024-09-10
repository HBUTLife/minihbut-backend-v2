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
      // 不存在缓存
      try {
        // 数据库查询
        const query = await this.app.mysql.query(
          'SELECT DISTINCT name, teacher FROM score WHERE (name LIKE ? OR teacher LIKE ?) AND teacher IS NOT NULL',
          [`%${keyword}%`, `%${keyword}%`]
        );

        if (query.length > 0) {
          // 有结果，存入 Redis
          const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(query), 'EX', 3600); // 1 小时过期

          if (cache_update === 'OK') {
            // 更新成功
            ctx.body = {
              code: 200,
              message: '给分统计搜索成功',
              data: query
            };
          } else {
            // 更新失败
            ctx.body = {
              code: 500,
              message: '服务器内部错误'
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

module.exports = StatisticSearchController;
