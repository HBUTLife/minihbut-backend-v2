// app/controller/info/swiper/click.js

const { Controller } = require('egg');
const dayjs = require('dayjs');

// 定义创建接口的请求参数规则
const createRule = {
  id: 'string'
};

class InfoSwiperClickController extends Controller {
  /**
   * 轮播点击计数
   */
  async index() {
    const { ctx } = this;

    // 参数校验
    ctx.validate(createRule, ctx.query);

    // 获取参数
    const id = parseInt(ctx.query.id);

    try {
      // 获取轮播列表
      const query = await ctx.app.mysql.query('SELECT * FROM swiper WHERE id = ? AND expire_time >= ?', [
        id,
        dayjs().format('YYYY-MM-DD')
      ]);

      if (query.length > 0) {
        // 存在且未过期
        try {
          // 更新数据库 click 计数
          const update = await ctx.app.mysql.update(
            'swiper',
            { click: query[0].click + 1 },
            { where: { id: parseInt(id) } }
          );

          if (update.affectedRows === 1) {
            // 更新成功
            ctx.body = {
              code: 200,
              message: '点击量记录成功'
            };
          } else {
            // 更新失败
            ctx.body = {
              code: 500,
              message: '服务器内部错误'
            };
          }
        } catch (err) {
          // 数据库更新失败
          ctx.logger.error(err);

          ctx.body = {
            code: 500,
            message: '服务器内部错误'
          };
        }
      } else {
        // 不存在或已过期
        ctx.body = {
          code: 404,
          message: '轮播已过期或不存在'
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

module.exports = InfoSwiperClickController;
