// app/controller/timetable/class/detail.js

const { Controller } = require('egg');
const cryptojs = require('crypto-js');

// 定义创建接口的请求参数规则
const createRule = {
  class: 'string'
};

class TimetableClassDetailController extends Controller {
  /**
   * 班级课表详情
   */
  async index() {
    const { ctx } = this;

    // 参数校验
    ctx.validate(createRule, ctx.query);

    // 获取关键词
    const class_name = ctx.query.class;

    // Redis Key
    const cache_key = `timetable_class_detail_${cryptojs.MD5(class_name).toString()}`;

    // Redis 获取班级课表缓存
    const cache = await ctx.app.redis.get(cache_key);

    if (cache) {
      // 存在缓存
      ctx.body = {
        code: 201,
        message: '班级课表获取成功',
        data: JSON.parse(cache)
      };
    } else {
      // 不存在缓存，从数据库中获取并存入 Redis
      const result = await ctx.app.mysql.query(
        'SELECT id, name, location, teacher, week, day, section FROM lesson WHERE classes LIKE ?',
        [`%${class_name}%`]
      );

      if (result.length > 0) {
        // 有结果，存入 Redis
        const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(result), 'EX', 86400); // 24 小时过期

        if (cache_update === 'OK') {
          // 更新成功
          ctx.body = {
            code: 200,
            message: '班级课表获取成功',
            data: result
          };
        } else {
          // 更新失败
          ctx.body = {
            code: 500,
            message: '班级课表缓存更新失败'
          };
        }
      } else {
        // 无结果
        ctx.body = {
          code: 404,
          message: '未找到班级相关课表'
        };
      }
    }
  }
}

module.exports = TimetableClassDetailController;
