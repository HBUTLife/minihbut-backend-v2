// app/controller/info/swiper/get.js

const { Controller } = require('egg');
const dayjs = require('dayjs');

class InfoSwiperGetController extends Controller {
  /**
   * 获取轮播
   */
  async index() {
    const { ctx } = this;

    try {
      // 获取轮播列表
      const query = await ctx.app.mysql.query(
        'SELECT id, title, image, url, miniprogram_id, is_ad FROM swiper WHERE expire_time >= ? ORDER BY id DESC',
        [dayjs().format('YYYY-MM-DD')]
      );

      if (query.length > 0) {
        // 存在且未过期
        ctx.body = {
          code: 200,
          message: '轮播获取成功',
          data: query
        };
      } else {
        // 不存在或已过期
        ctx.body = {
          code: 404,
          message: '轮播列表为空'
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

module.exports = InfoSwiperGetController;
