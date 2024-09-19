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

    try {
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
          teacher: ctx.request.body.teacher ? ctx.request.body.teacher : '',
          week: ctx.request.body.week ? ctx.request.body.week : origin[0].week,
          day: ctx.request.body.day ? parseInt(ctx.request.body.day) : origin[0].day,
          section: ctx.request.body.section ? ctx.request.body.section : origin[0].section,
          term: origin[0].term,
          student_id: origin[0].student_id,
          last_update: dayjs().unix()
        };

        try {
          // 更新数据库
          const update = await ctx.app.mysql.update('timetable_custom', data, {
            where: {
              id,
              term,
              student_id: user.student_id
            }
          });

          if (update.affectedRows === 1) {
            // 更新成功，清除原有课表缓存
            await ctx.app.redis.del(`timetable_person_${user.student_id}_${term}`); // 课程列表
            await ctx.app.redis.del(`timetable_person_today_${user.student_id}`); // 即将开始课程列表

            ctx.body = {
              code: 200,
              message: '自定义课程编辑成功',
              data
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
        // 不存在
        ctx.body = {
          code: 404,
          message: '自定义课程不存在'
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

module.exports = TimetablePersonEditController;
