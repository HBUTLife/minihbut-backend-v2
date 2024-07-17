// app/controller/info/other.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  id: 'string'
};

class InfoOtherController extends Controller {
  /**
   * 其他信息获取方法
   */
  async index() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.query);
    // 获取参数
    const id = ctx.query.id;
    // 查询信息
    const result = await ctx.app.mysql.select('other', {
      where: {
        id: id
      }
    });

    if(result.length > 0) {
      ctx.body = {
        code: 200,
        message: '获取成功',
        data: {
          event: result[0].event,
          content: JSON.parse(result[0].content)
        }
      };
    } else {
      ctx.body = {
        code: 404,
        message: '未找到事件'
      };
    }
  }
}

module.exports = InfoOtherController;
