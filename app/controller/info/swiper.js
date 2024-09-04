// app/controller/info/swiper.js

const { Controller } = require('egg');
const dayjs = require('dayjs');

// 定义创建接口的请求参数规则
const createRule = {
  id: 'string'
};

class InfoSwiperController extends Controller {
  /**
   * 获取轮播图
   */
  async index() {
    const { ctx } = this;
    const now = dayjs().unix();
    const hit = await ctx.app.mysql.query(
      'SELECT id, title, image, url, is_ad FROM swiper WHERE expire_time >= ? ORDER BY id DESC',
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

  /**
   * 轮播点击计数
   */
  async count() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.request.body);
    // 获取参数
    const id = ctx.request.body.id;
    // 现有点击量
    const now = dayjs().unix();
    const click = await ctx.app.mysql.query('SELECT * FROM swiper WHERE id = ? AND expire_time >= ?', [
      parseInt(id),
      now
    ]);
    if (click.length > 0) {
      // 有内容
      const update = await ctx.app.mysql.update(
        'swiper',
        { click: click[0].click + 1 },
        { where: { id: parseInt(id) } }
      );
      if (update.affectedRows === 1) {
        // 更新成功
        ctx.body = {
          code: 200,
          message: 'OK'
        };
      } else {
        // 更新失败
        ctx.body = {
          code: 500,
          message: '数据库更新失败'
        };
      }
    } else {
      // 无内容
      ctx.body = {
        code: 404,
        message: '轮播已过期或不存在'
      };
    }
  }
}

module.exports = InfoSwiperController;
