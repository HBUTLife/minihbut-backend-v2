// app/controller/info/miniprogram.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  id: 'string'
};

class InfoMiniprogramController extends Controller {
  /**
   * 获取小程序信息
   */
  async index() {
    const { ctx } = this;

    // 参数校验
    ctx.validate(createRule, ctx.query);

    // 获取参数
    const id = parseInt(ctx.query.id);

    // 查看缓存
    const cache_key = `info_miniprogram_${id}`;
    const cache = await ctx.app.redis.get(cache_key);

    if (cache) {
      // 有缓存
      ctx.body = {
        code: 201,
        message: '小程序信息获取成功',
        data: JSON.parse(cache)
      };
    } else {
      // 无缓存
      try {
        // 获取小程序信息
        const query = await ctx.app.mysql.query(
          'SELECT title, app_id, path, extra_data, embedded, cache_time FROM miniprogram WHERE id = ?',
          [id]
        );

        // 无结果
        if (query.length === 0) {
          ctx.body = {
            code: 404,
            message: '未找到相关小程序信息'
          };
          return;
        }

        // 有结果，存入缓存
        const cache_time = query[0].cache_time;
        delete query[0].cache_time;

        if (query[0].extra_data) {
          query[0].extra_data = JSON.parse(query[0].extra_data);
        }

        const cache_update = await ctx.app.redis.set(
          cache_key,
          JSON.stringify(query[0]),
          'EX',
          cache_time ? cache_time : 300
        ); // 默认 5 分钟

        if (cache_update === 'OK') {
          // 缓存成功
          ctx.body = {
            code: 200,
            message: '小程序信息获取成功',
            data: query[0]
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

module.exports = InfoMiniprogramController;
