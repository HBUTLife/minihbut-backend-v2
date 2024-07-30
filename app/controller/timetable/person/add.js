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
    // 写入数据库
    const hit = await ctx.app.mysql.insert('timetable_custom', data);
    if (hit.affectedRows === 1) {
      // 写入成功，若原有课表缓存则更新缓存
      const cache_key = `timetable_person_${user.student_id}_${term}`;
      const cache = await ctx.app.redis.get(cache_key);
      if (cache) {
        // 存在缓存则更新
        const origin_data = JSON.parse(cache);
        origin_data.push(data);
        await ctx.app.redis.set(cache_key, JSON.stringify(origin_data), 'EX', 604800); // 7 天过期
      }
      ctx.body = {
        code: 200,
        message: '自定义课程添加成功',
        data
      };
    } else {
      // 写入失败
      ctx.body = {
        code: 500,
        message: '自定义课程写入数据库失败'
      };
    }
  }
}

module.exports = TimetablePersonAddController;
