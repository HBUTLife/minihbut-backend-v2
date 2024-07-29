// app/controller/info/article.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  id: 'string'
};

class InfoArticleController extends Controller {
  /**
   * 获取文章内容
   */
  async index() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.query);
    // 获取参数
    const id = ctx.query.id;
    // 查询信息
    const result = await ctx.app.mysql.select('article', {
      where: {
        id
      }
    });

    if (result.length > 0) {
      ctx.body = {
        code: 200,
        message: '获取成功',
        data: {
          title: result[0].title,
          content: JSON.parse(result[0].content),
          create_time: result[0].create_time,
          last_update: result[0].last_update
        }
      };
    } else {
      ctx.body = {
        code: 404,
        message: '未找到文章'
      };
    }
  }
}

module.exports = InfoArticleController;
