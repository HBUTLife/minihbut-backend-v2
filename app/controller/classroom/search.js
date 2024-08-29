// app/controller/classroom/search.js

const { Controller } = require('egg');
const cryptojs = require('crypto-js');

// 定义创建接口的请求参数规则
const createRule = {
  building: 'string',
  week: 'string',
  day: 'string',
  section: 'string'
};

class ClassroomSearchController extends Controller {
  /**
   * 空教室查询方法
   */
  async index() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.query);
    // 获取参数
    const building = ctx.query.building;
    const week = ctx.query.week;
    const day = ctx.query.day;
    const section = ctx.query.section;
    // Redis Key
    const md5 = cryptojs.MD5(`${building}_${week}_${day}_${section}`).toString();
    const cache_key = `classroom_${md5}`;
    // Redis 获取空教室缓存
    const cache = await ctx.app.redis.get(cache_key);
    if (cache) {
      // 存在缓存
      ctx.body = {
        code: 201,
        message: '空教室获取成功',
        data: JSON.parse(cache)
      };
    } else {
      // 不存在缓存，从教务系统获取
      const user = ctx.user_info;
      // 获取登录信息
      const pass = await ctx.app.mysql.select('user', {
        where: {
          student_id: user.student_id
        }
      });

      try {
        const classroom_base_url = ctx.app.config.jwxt.base + ctx.app.config.jwxt.classroom;
        const classroom_url = `${classroom_base_url}?gridtype=jqgrid&page.size=500&page.pn=1&sort=id&order=asc&type=1&jxldm=${building}&zcStr=${week}&xqStr=${day}&jcStr=${section}`;
        const result = await ctx.curl(classroom_url, {
          method: 'GET',
          headers: {
            cookie: `uid=${pass[0].jw_uid}; route=${pass[0].jw_route}`
          },
          dataType: 'json'
        });

        if (result.status === 200) {
          // 获取成功
          const parse_data = [];
          if (result.data.total > 0) {
            for (const item of result.data.results) {
              parse_data.push({
                id: parseInt(item.id),
                name: item.jsmc,
                type: parseInt(item.jslx),
                seat: item.zdskrnrs
              });
            }
          }
          // 存入 Redis
          const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(parse_data), 'EX', 3600); // 1 小时过期
          if (cache_update === 'OK') {
            // 更新成功
            ctx.body = {
              code: 200,
              message: '空教室获取成功',
              data: parse_data
            };
          } else {
            // 更新失败
            ctx.body = {
              code: 500,
              message: '空教室缓存更新失败'
            };
          }
        } else {
          // 登录过期，重新登录获取
          const reauth = await ctx.service.auth.idaas(user.student_id);
          if (reauth.code === 200) {
            // 重新授权成功重新执行
            await this.index();
          } else {
            // 重新授权失败
            ctx.body = reauth;
          }
        }
      } catch (err) {
        // 教务系统无法访问，返回错误
        ctx.body = {
          code: 500,
          message: '教务系统无法访问'
        };
      }
    }
  }
}

module.exports = ClassroomSearchController;
