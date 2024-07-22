// app/controller/info/term.js

const { Controller } = require('egg');

class InfoTermController extends Controller {
  /**
   * 获取学期列表方法
   */
  async index() {
    const { ctx } = this;
    try {
      const result = await ctx.app.mysql.select('term', { orders: [['id', 'desc']] });
      // 获取成功
      ctx.body = {
        code: 200,
        message: '获取成功',
        data: result
      };
    } catch(err) {
      // 获取失败
      ctx.body = {
        code: 500,
        message: '从数据库中获取学期列表出错'
      };
    }
  }
}

module.exports = InfoTermController;
