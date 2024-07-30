// app/controller/timetable/person/delete.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  id: 'string',
  term: 'string'
};

class TimetablePersonDeleteController extends Controller {
  /**
   * 删除自定义课程
   */
  async index() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.request.body);
    // 获取参数
    const id = ctx.request.body.id;
    const term = ctx.request.body.term;
    // 初始化个人信息
    const user = ctx.user_info;
    // 删除操作
    const hit = await ctx.app.mysql.delete('timetable_custom', {
      id,
      term,
      student_id: user.student_id
    });
    if (hit.affectedRows === 1) {
      // 删除成功，若原有课表缓存则更新缓存
      const cache_key = `timetable_person_${user.student_id}_${term}`;
      const cache = await ctx.app.redis.get(cache_key);
      if (cache) {
        // 存在缓存则更新
        const origin_data = JSON.parse(cache);
        const final_data = origin_data.filter(item => item.id !== id);
        await ctx.app.redis.set(cache_key, JSON.stringify(final_data), 'EX', 604800); // 7 天过期
      }
      ctx.body = {
        code: 200,
        message: '自定义课程删除成功',
        data: {
          id,
          term,
          student_id: user.student_id
        }
      };
    } else {
      // 不存在或删除失败
      ctx.body = {
        code: 500,
        message: '自定义课程不存在或删除失败'
      };
    }
  }
}

module.exports = TimetablePersonDeleteController;
