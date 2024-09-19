// app/controller/timetable/person/today.js

const { Controller } = require('egg');
const dayjs = require('dayjs');

class TimetablePersonTodayController extends Controller {
  /**
   * 获取今日课程
   */
  async index() {
    const { ctx } = this;

    // 初始化个人信息
    const user = ctx.user_info;

    // Redis Key
    const cache_key = `timetable_person_today_${user.student_id}`;

    // Redis 获取今日课表数据
    const cache = await ctx.app.redis.get(cache_key);

    if (cache) {
      // 存在缓存
      ctx.body = {
        code: 201,
        message: '今日课表获取成功',
        data: JSON.parse(cache)
      };
    } else {
      // 不存在缓存，从数据库中获取并存入 Redis
      const today_timestamp = dayjs().unix();
      try {
        const query = await ctx.app.mysql.query(
          'SELECT * FROM term WHERE start_timestamp <= ? AND end_timestamp >= ?',
          [today_timestamp, today_timestamp]
        );

        if (query.length > 0) {
          // 在学期内
          const week = Math.ceil((today_timestamp - query[0].start_timestamp) / (7 * 24 * 3600));
          const day_origin = new Date().getDay();
          let day = day_origin;
          if (day_origin === 0) {
            day = 7;
          }

          try {
            // 获取学期和星期符合的所有课程
            const query2 = await ctx.app.mysql.select('timetable', {
              where: {
                student_id: user.student_id,
                day,
                term: query[0].name
              }
            });
            const query3 = await ctx.app.mysql.select('timetable_custom', {
              where: {
                student_id: user.student_id,
                day,
                term: query[0].name
              }
            });
            const timetable = query2.concat(query3);

            // 对周次进行处理和选取
            const day_tables = [];
            for (const item of timetable) {
              const weeks = item.week.split(',');
              if (weeks.includes(week.toString())) {
                // 检查课程是否已经结束
                const check = this.checkTime(item, today_timestamp);

                if (!check) {
                  // 未结束
                  day_tables.push(item);
                }
              }
            }

            // 排序
            day_tables.sort((a, b) => {
              const sectionA = parseInt(a.section.split(',')[0]);
              const sectionB = parseInt(b.section.split(',')[0]);
              return sectionA - sectionB;
            });

            // 存入Redis
            const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(day_tables), 'EX', 300); // 5 分钟

            if (cache_update === 'OK') {
              // 存入成功
              ctx.body = {
                code: 200,
                message: '今日课表获取成功',
                data: day_tables
              };
            } else {
              // 存入失败
              ctx.body = {
                code: 500,
                message: '服务器内部错误'
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
        } else {
          // 不在学期内
          ctx.body = {
            code: 403,
            message: '学期未开始或已结束'
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

  // 检查课程是否结束
  checkTime(data, timestamp) {
    const sections = data.section.split(',');
    const end_section = sections[sections.length - 1]; // 课程最后节次
    const end_time = this.getEndTime(end_section);
    const end_timestamp = dayjs().hour(end_time.h).minute(end_time.m).second(0).unix(); // 课程结束时间戳

    if (timestamp > end_timestamp) {
      // 课程已经结束了
      return true;
    }

    return false;
  }

  // 获取节次结束时间
  getEndTime(section) {
    // eslint-disable-next-line default-case
    switch (parseInt(section)) {
      case 1:
        return { h: 9, m: 5 }; // 09:05
      case 2:
        return { h: 9, m: 55 }; // 09:55
      case 3:
        return { h: 11, m: 0 }; // 11:00
      case 4:
        return { h: 11, m: 50 }; // 11:50
      case 5:
        return { h: 14, m: 45 }; // 14:45
      case 6:
        return { h: 15, m: 35 }; // 15:35
      case 7:
        return { h: 16, m: 40 }; // 16:40
      case 8:
        return { h: 17, m: 30 }; // 17:30
      case 9:
        return { h: 19, m: 15 }; // 19:15
      case 10:
        return { h: 20, m: 5 }; // 20:05
      case 11:
        return { h: 20, m: 55 }; // 20:55
    }
  }
}

module.exports = TimetablePersonTodayController;
