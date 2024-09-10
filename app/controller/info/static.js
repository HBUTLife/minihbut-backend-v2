// app/controller/info/static.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  id: 'string'
};

class InfoStaticController extends Controller {
  /**
   * 获取静态文件列表
   */
  async index() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.query);

    // 获取参数
    const id = parseInt(ctx.query.id);

    // 查看缓存
    const cache_key = `info_static_${id}`;
    const cache = await ctx.app.redis.get(cache_key);

    if (cache) {
      // 有缓存
      ctx.body = {
        code: 201,
        message: '静态文件列表获取成功',
        data: JSON.parse(cache)
      };
    } else {
      // 无缓存
      try {
        // 获取静态文件列表
        const query = await ctx.app.mysql.select('static_list', { where: { id } });

        // 若无文件列表
        if (query.length === 0) {
          ctx.body = {
            code: 404,
            message: '未找到静态文件列表'
          };
          return;
        }

        // 若有文件列表，则获取所有文件
        const static_id_arr = query[0].statics.split(',');
        const list = [];

        // 循环获取所有文件
        for (const item of static_id_arr) {
          const list_item = await ctx.app.mysql.select('static', { where: { id: parseInt(item) } });

          if (list_item.length > 0) {
            list.push(list_item[0].url);
          }
        }

        // 存入缓存
        const cache_update = await ctx.app.redis.set(
          cache_key,
          JSON.stringify(list),
          'EX',
          query[0].cache_time ? query[0].cache_time : 300
        ); // 默认 5 分钟

        if (cache_update === 'OK') {
          // 缓存成功
          ctx.body = {
            code: 200,
            message: '静态文件列表获取成功',
            data: list
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

module.exports = InfoStaticController;
