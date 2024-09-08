// app/controller/timetable/person/ics.js

const { Controller } = require('egg');
const ics = require('ics');
const dayjs = require('dayjs');

// 定义创建接口的请求参数规则
const createRule = {
  token: 'string'
};

class TimetablePersonIcs extends Controller {
  /**
   * 获取ICS日历文件
   */
  async index() {
    const { ctx } = this;

    // 参数校验
    ctx.validate(createRule, ctx.query);

    // 获取 Token
    const token = ctx.query.token;

    // Redis Key
    const cache_key = `timetable_person_ics_${token}`;

    // Redis 获取 ICS 内容
    const cache = await ctx.app.redis.get(cache_key);

    if (cache) {
      // 存在缓存
      ctx.set('Content-Type', 'text/calendar');
      ctx.set('Content-Disposition', `attachment; filename=${token}.ics`);
      ctx.body = cache;
    } else {
      // 不存在缓存，检测 Token 是否存在
      const info = await ctx.app.mysql.select('timetable_export', { where: { token } });

      if (info.length > 0) {
        // Token 存在，从数据库获取课表
        const timetable = await ctx.app.mysql.select('timetable', {
          where: {
            term: info[0].term,
            student_id: info[0].student_id
          }
        });

        // 数据库中获取学期信息
        const term = await ctx.app.mysql.select('term', {
          where: {
            name: info[0].term
          }
        });

        // 获取学期基础信息，创建 ICS 事件数据
        const data = [];
        for (const item of timetable) {
          const weeks = item.week.split(',');
          for (const week of weeks) {
            const day_plus = (week - 1) * 7 + (item.day - 1);
            const start_time = dayjs(term[0].start_date).add(day_plus, 'day');
            const detail_time = this.getStartTime(item.section);
            data.push({
              title: item.name,
              location: item.location,
              description: `授课老师：${item.teacher}`,
              start: [start_time.year(), start_time.month() + 1, start_time.date(), detail_time.h, detail_time.m],
              duration: this.getDuration(item.section)
            });
          }
        }

        // 生成 ICS 文件内容
        const { error, value } = ics.createEvents(data);
        if (error) {
          console.log(error);

          ctx.body = {
            code: 500,
            message: 'ICS文件生成失败'
          };
          return;
        }

        // 存入 Redis
        const cache_update = await ctx.app.redis.set(cache_key, value, 'EX', 3600); // 1 小时过期

        if (cache_update === 'OK') {
          // 存入成功
          ctx.set('Content-Type', 'text/calendar');
          ctx.set('Content-Disposition', `attachment; filename=${token}.ics`);
          ctx.body = value;
        } else {
          // 存入失败
          ctx.body = {
            code: 500,
            message: 'ICS文件存入缓存失败'
          };
        }
      } else {
        // Token 不存在
        ctx.body = {
          code: 404,
          message: '获取ICS文件的token不存在'
        };
      }
    }
  }

  /**
   * 获取课程开始时间
   * @param {string} section 节次
   * @return {object} 小时，分钟
   */
  getStartTime(section) {
    const start_section = parseInt(section.split(',')[0]); // 开始节次

    // eslint-disable-next-line default-case
    switch (start_section) {
      case 1:
        return { h: 8, m: 20 };
      case 2:
        return { h: 9, m: 10 };
      case 3:
        return { h: 10, m: 15 };
      case 4:
        return { h: 11, m: 5 };
      case 5:
        return { h: 14, m: 0 };
      case 6:
        return { h: 14, m: 50 };
      case 7:
        return { h: 15, m: 55 };
      case 8:
        return { h: 16, m: 45 };
      case 9:
        return { h: 18, m: 30 };
      case 10:
        return { h: 19, m: 20 };
      case 11:
        return { h: 20, m: 10 };
    }
  }

  /**
   * 获取课程时长
   * @param {string} section 节次
   * @return {object} 小时，分钟
   */
  getDuration(section) {
    const sec_arr = section.split(',');
    const sec_count = sec_arr.length; // 几节课
    const total_minutes = 45 * sec_count + 5 * (sec_count - 1);

    return {
      hours: Math.floor(total_minutes / 60),
      minutes: total_minutes % 60
    };
  }
}

module.exports = TimetablePersonIcs;
