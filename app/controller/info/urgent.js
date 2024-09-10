// app/controller/info/urgent.js

const { Controller } = require('egg');
const dayjs = require('dayjs');

class InfoUrgentController extends Controller {
  /**
   * 获取紧急通知
   */
  async index() {
    const { ctx } = this;

    try {
      // 获取紧急通知
      const query = await ctx.app.mysql.query(
        'SELECT title, content FROM urgent WHERE expire_time >= ? ORDER BY id DESC',
        [dayjs().format('YYYY-MM-DD HH:mm:ss')]
      );

      // 无紧急通知
      if (query.length === 0) {
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
        data: query[0]
      };
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

module.exports = InfoUrgentController;
