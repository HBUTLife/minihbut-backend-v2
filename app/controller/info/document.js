// app/controller/info/document.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  id: 'string'
};

class InfoDocumentController extends Controller {
  /**
   * 获取腾讯文档链接
   */
  async index() {
    const { ctx } = this;

    // 参数校验
    ctx.validate(createRule, ctx.query);

    // 获取参数
    const id = parseInt(ctx.query.id);

    // 查看缓存
    const cache_key = `info_document_${id}`;
    const cache = await ctx.app.redis.get(cache_key);

    if (cache) {
      // 有缓存
      ctx.body = {
        code: 201,
        message: '文档链接获取成功',
        data: JSON.parse(cache)
      };
    } else {
      // 无缓存，获取文档链接
      const query = await ctx.app.mysql.query('SELECT title, url, full_screen, cahce_time FROM document WHERE id = ?', [
        id
      ]);

      // 无结果
      if (query.length === 0) {
        ctx.body = {
          code: 404,
          message: '未找到相关文档'
        };
        return;
      }

      // 有结果，存入缓存
      const data = query[0];
      delete data.cache_time;
      const cache_update = await ctx.app.redis.set(
        cache_key,
        JSON.stringify(data),
        'EX',
        query[0].cache_time ? query[0].cache_time : 300
      ); // 默认 5 分钟

      if (cache_update === 'OK') {
        ctx.body = {
          code: 200,
          message: '文档链接获取成功',
          data
        };
      } else {
        ctx.body = {
          code: 500,
          message: '文档链接缓存出错'
        };
      }
    }
  }
}

module.exports = InfoDocumentController;
