// app/controller/info/urgent.js

const { Controller } = require('egg');
const dayjs = require('dayjs');

class InfoUrgentController extends Controller {
  /**
   * 获取紧急公告
   */
  async index() {
    const { ctx } = this;

    // 数据库获取
    const result = await ctx.app.mysql.query(
      'SELECT title, content FROM urgent WHERE expire_time >= ? ORDER BY id DESC',
      [dayjs().format('YYYY-MM-DD HH:mm:ss')]
    );

    // 无紧急通知
    if (result.length === 0) {
      ctx.body = {
        code: 200,
        message: '无紧急通知'
      };
      return;
    }

    // 有紧急通知
    ctx.body = {
      code: 200,
      message: '紧急通知获取成功',
      data: result[0]
    };
  }
}

module.exports = InfoUrgentController;
