// app/controller/info/swiper.js

const { Controller } = require('egg');
const dayjs = require('dayjs');

class InfoSwiperController extends Controller {
  /**
   * 获取轮播图
   */
  async index() {
    const { ctx } = this;
    const now = dayjs().unix();
    const hit = await ctx.app.mysql.query(
      'SELECT title, image, url, is_ad FROM swiper WHERE expire_time >= ? ORDER BY id DESC',
      [now]
    );
    if (hit.length > 0) {
      // 有内容
      ctx.body = {
        code: 200,
        message: '轮播图获取成功',
        data: hit
      };
    } else {
      // 无内容
      ctx.body = {
        code: 404,
        message: '轮播图为空'
      };
    }
  }
}

module.exports = InfoSwiperController;
