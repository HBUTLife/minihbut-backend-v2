// app/controller/info/term.js

const { Controller } = require('egg');

class InfoTermController extends Controller {
  /**
   * 获取学期列表方法
   */
  async index() {
    const { ctx } = this;
    // 初始化个人信息
    const user = ctx.user_info;
    try {
      const result = await ctx.app.mysql.select('term', { orders: [['id', 'desc']] });
      // 获取成功，根据用户入学年级进行处理
      const term_list = [];
      for (const item of result) {
        const start = parseInt(item.name.split('-')[0]);
        if (start >= user.grade_enter) {
          term_list.push(item);
        }
      }
      ctx.body = {
        code: 200,
        message: '学期列表获取成功',
        data: term_list
      };
    } catch (err) {
      // 获取失败
      ctx.body = {
        code: 500,
        message: '从数据库中获取学期列表出错'
      };
    }
  }
}

module.exports = InfoTermController;
