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

    try {
      // 删除操作
      const del = await ctx.app.mysql.delete('timetable_custom', {
        id,
        term,
        student_id: user.student_id
      });

      if (del.affectedRows === 1) {
        // 删除成功，清除原有课表缓存
        await ctx.app.redis.del(`timetable_person_${user.student_id}_${term}`); // 课程列表
        await ctx.app.redis.del(`timetable_person_today_${user.student_id}`); // 即将开始课程列表

        ctx.body = {
          code: 200,
          message: '自定义课程删除成功',
          data: {
            id,
            term,
            student_id: user.student_id
          }
        };
      } else if (del.affectedRows === 0) {
        // 不存在
        ctx.body = {
          code: 404,
          message: '自定义课程不存在'
        };
      } else {
        // 删除失败
        ctx.body = {
          code: 500,
          message: '服务器内部错误'
        };
      }
    } catch (err) {
      // 数据库删除失败
      ctx.logger.error(err);

      ctx.body = {
        code: 500,
        message: '服务器内部错误'
      };
    }
  }
}

module.exports = TimetablePersonDeleteController;
