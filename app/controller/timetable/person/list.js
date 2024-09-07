// app/controller/timetable/person/list.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  term: 'string'
};

class TimetablePersonListController extends Controller {
  /**
   * 获取个人课表列表
   */
  async index() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.query);

    // 获取学期
    const term = ctx.query.term;

    // 初始化个人信息
    const user = ctx.user_info;

    // Redis Key
    const cache_key = `timetable_person_${user.student_id}_${term}`;

    // Redis 获取课表列表
    const cache = await ctx.app.redis.get(cache_key);

    if (cache) {
      // 存在缓存
      ctx.body = {
        code: 201,
        message: '个人课表列表获取成功',
        data: JSON.parse(cache)
      };
    } else {
      // 不存在缓存，从数据库获取并存入 Redis
      const local = await ctx.app.mysql.select('timetable', {
        where: {
          term,
          student_id: user.student_id
        }
      });

      if (local.length > 0) {
        // 数据库中有数据，存入 Redis
        const custom = await ctx.app.mysql.select('timetable_custom', {
          where: {
            term,
            student_id: user.student_id
          }
        });
        custom.forEach(item => {
          item.self = true;
        });
        const final_data = local.concat(custom);
        const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(final_data), 'EX', 604800); // 7 天过期
        if (cache_update === 'OK') {
          // 更新成功
          ctx.body = {
            code: 202,
            message: '个人课表列表获取成功',
            data: final_data
          };
        } else {
          // 更新失败
          ctx.body = {
            code: 500,
            message: '个人课表列表缓存更新失败'
          };
        }
      } else {
        // 数据库中无数据，获取课表数据
        const timetable = await ctx.service.timetable.update(user.student_id, term);
        if (timetable.status === 1) {
          // 获取成功
          ctx.body = {
            code: 200,
            message: '个人课表列表获取成功',
            data: timetable.data
          };
        } else if (timetable.status === 2) {
          // 获取成功，无数据
          ctx.body = {
            code: 200,
            message: '个人课表列表获取成功',
            data: []
          };
        } else if (timetable.status === 3) {
          // 登录过期，重新登录获取
          const reauth = await ctx.service.auth.idaas(user.student_id);
          if (reauth.code === 200) {
            // 重新授权成功重新执行
            await this.index();
          } else {
            // 重新授权失败
            ctx.body = reauth;
          }
        } else if (timetable.status === 4) {
          // 教务系统错误
          ctx.body = {
            code: 500,
            message: '教务系统无法连接'
          };
        }
      }
    }
  }
}

module.exports = TimetablePersonListController;
