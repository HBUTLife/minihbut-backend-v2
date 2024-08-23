// app/controller/timetable/person/edit.js

const { Controller } = require('egg');
const dayjs = require('dayjs');

// 定义创建接口的请求参数规则
const createRule = {
  id: 'string',
  term: 'string'
};

class TimetablePersonEditController extends Controller {
  /**
   * 编辑自定义课程
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
    // 获取原数据
    const origin = await ctx.app.mysql.select('timetable_custom', {
      where: {
        id,
        term,
        student_id: user.student_id
      }
    });
    if (origin.length > 0) {
      // 存在
      const data = {
        id: origin[0].id,
        name: ctx.request.body.name ? ctx.request.body.name : origin[0].name,
        location: ctx.request.body.location ? ctx.request.body.location : origin[0].location,
        teacher: ctx.request.body.teacher ? ctx.request.body.teacher : origin[0].teacher,
        week: ctx.request.body.week ? ctx.request.body.week : origin[0].week,
        day: ctx.request.body.day ? parseInt(ctx.request.body.day) : origin[0].day,
        section: ctx.request.body.section ? ctx.request.body.section : origin[0].section,
        term: origin[0].term,
        student_id: origin[0].student_id,
        last_update: dayjs().unix()
      };
      // 更新数据库
      const hit = await ctx.app.mysql.update('timetable_custom', data, {
        where: {
          id,
          term,
          student_id: user.student_id
        }
      });
      if (hit.affectedRows === 1) {
        // 更新成功，若原有课表缓存则更新缓存
        const cache_key = `timetable_person_${user.student_id}_${term}`;
        const cache = await ctx.app.redis.get(cache_key);
        if (cache) {
          // 存在缓存则更新
          const origin_data = JSON.parse(cache);
          const final_data = origin_data.filter(item => item.id !== id);
          data.self = true;
          final_data.push(data);
          await ctx.app.redis.set(cache_key, JSON.stringify(final_data), 'EX', 604800); // 7 天过期
        }
        ctx.body = {
          code: 200,
          message: '自定义课程编辑成功',
          data
        };
      } else {
        // 更新失败
        ctx.body = {
          code: 500,
          message: '自定义课程编辑失败'
        };
      }
    } else {
      // 不存在
      ctx.body = {
        code: 404,
        message: '自定义课程不存在'
      };
    }
  }
}

module.exports = TimetablePersonEditController;
