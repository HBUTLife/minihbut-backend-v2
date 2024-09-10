// app/controller/info/share.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  id: 'string'
};

class InfoShareController extends Controller {
  /**
   * 获取分享信息
   */
  async index() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.query);

    // 获取参数
    const id = parseInt(ctx.query.id);

    // 查看缓存
    const cache_key = `info_share_${id}`;
    const cache = await ctx.app.redis.get(cache_key);

    if (cache) {
      // 有缓存
      ctx.body = {
        code: 201,
        message: '分享信息获取成功',
        data: JSON.parse(cache)
      };
    } else {
      // 无缓存
      try {
        // 获取分享信息
        const query = await ctx.app.mysql.query('SELECT title, image, path, cache_time FROM share WHERE id = ?', [id]);

        // 无分享信息
        if (query.length === 0) {
          ctx.body = {
            code: 404,
            message: '未找到分享信息'
          };
          return;
        }

        // 有分享信息，信息处理
        const data = query[0];
        delete data.cache_time;

        // 写入 Redis缓存
        const cache_update = await ctx.app.redis.set(
          cache_key,
          JSON.stringify(data),
          'EX',
          query[0].cache_time ? query[0].cache_time : 300
        ); // 默认 5 分钟

        if (cache_update === 'OK') {
          // 缓存成功
          ctx.body = {
            code: 200,
            message: '分享信息获取成功',
            data
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

module.exports = InfoShareController;
