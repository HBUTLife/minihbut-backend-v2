// app/controller/info/swiper/get.js

const { Controller } = require('egg');
const dayjs = require('dayjs');

class InfoSwiperGetController extends Controller {
  /**
   * 获取轮播
   */
  async index() {
    const { ctx } = this;

    const query = await ctx.app.mysql.query(
      'SELECT id, title, image, type, url, app_id, is_ad FROM swiper WHERE expire_time >= ? ORDER BY id DESC',
      [dayjs().format('YYYY-MM-DD')]
    );

    if (query.length > 0) {
      // 有内容
      ctx.body = {
        code: 200,
        message: '轮播获取成功',
        data: query
      };
    } else {
      // 无内容
      ctx.body = {
        code: 404,
        message: '无正在展示的轮播'
      };
    }
  }
}

module.exports = InfoSwiperGetController;
