// app/controller/timetable/person/add.js

const { Controller } = require('egg');
const dayjs = require('dayjs');
const cryptojs = require('crypto-js');

// 定义创建接口的请求参数规则
const createRule = {
  term: 'string',
  name: 'string',
  location: 'string',
  week: 'string',
  day: 'string',
  section: 'string'
};

class TimetablePersonAddController extends Controller {
  /**
   * 添加自定义课程
   */
  async index() {
    const { ctx } = this;

    // 参数校验
    ctx.validate(createRule, ctx.request.body);

    // 初始化个人信息
    const user = ctx.user_info;

    // 获取参数
    const term = ctx.request.body.term;
    const last_update = dayjs().unix();
    const data = {
      id: cryptojs.MD5(`${user.student_id}_${term}_${ctx.request.body.name}_${last_update}`).toString(),
      name: ctx.request.body.name,
      location: ctx.request.body.location,
      teacher: ctx.request.body.teacher,
      week: ctx.request.body.week,
      day: parseInt(ctx.request.body.day),
      section: ctx.request.body.section,
      term,
      student_id: user.student_id,
      last_update
    };

    try {
      // 写入数据库
      const insert = await ctx.app.mysql.insert('timetable_custom', data);

      if (insert.affectedRows === 1) {
        // 写入成功，清除原有课表缓存
        await ctx.app.redis.del(`timetable_person_${user.student_id}_${term}`); // 课程列表
        await ctx.app.redis.del(`timetable_person_today_${user.student_id}`); // 即将开始课程列表

        ctx.body = {
          code: 200,
          message: '自定义课程添加成功',
          data
        };
      } else {
        // 写入失败
        ctx.body = {
          code: 500,
          message: '服务器内部错误'
        };
      }
    } catch (err) {
      // 数据库插入失败
      ctx.logger.error(err);

      ctx.body = {
        code: 500,
        message: '服务器内部错误'
      };
    }
  }
}

module.exports = TimetablePersonAddController;
