// app/controller/exam/list.js

const { Controller } = require('egg');
const dayjs = require('dayjs');

// 定义创建接口的请求参数规则
const createRule = {
  term: 'string'
};

class ExamListController extends Controller {
  /**
   * 考试列表查询
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
    const cache_key = `exam_${user.student_id}_${term}`;

    // Redis 获取考试列表
    const cache = await ctx.app.redis.get(cache_key);

    if (cache) {
      // 存在缓存
      ctx.body = {
        code: 201,
        message: '考试列表获取成功',
        data: JSON.parse(cache)
      };
    } else {
      // 不存在缓存，从教务系统获取并存入数据库中
      try {
        // 数据库查询并获取用户 jw_uid, jw_route
        const query_user = await ctx.app.mysql.select('user', {
          where: {
            student_id: user.student_id
          }
        });

        try {
          // 请求教务系统考试列表接口
          const request = await ctx.curl(ctx.app.config.jwxt.base + ctx.app.config.jwxt.url.exam, {
            method: 'GET',
            headers: { cookie: `uid=${query_user[0].jw_uid}; route=${query_user[0].jw_route}` },
            data: { xnxq: term },
            dataType: 'json'
          });

          if (request.status === 200) {
            // 获取成功
            if (request.data.total > 0) {
              // 信息处理
              const data = await this.processData(user.student_id, term, request.data.results, ctx);

              // 存入 Redis
              const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(data), 'EX', 300); // 5 分钟过期

              if (cache_update === 'OK') {
                // 缓存更新成功
                ctx.body = {
                  code: 200,
                  message: '考试列表获取成功',
                  data
                };
              } else {
                // 缓存更新失败
                ctx.body = {
                  code: 500,
                  message: '服务器内部错误'
                };
              }
            } else {
              // 结果为空直接返回
              ctx.body = {
                code: 200,
                message: '考试列表获取成功',
                data: []
              };
            }
          } else if (request.status >= 300 && request.status < 400) {
            // 登录过期，重新登录获取
            const reauth = await ctx.service.auth.idaas(user.student_id);

            if (reauth.code === 200) {
              // 重新授权成功重新执行
              await this.index();
            } else {
              // 重新授权失败
              ctx.body = reauth;
            }
          } else {
            // 教务系统发生其他错误
            ctx.body = {
              code: 400,
              message: request.statusMessage
            };
          }
        } catch (err) {
          // 教务系统接口请求失败
          ctx.logger.error(err);

          try {
            // 展示数据库内数据并存入 Redis
            const query = await ctx.app.mysql.select('exam', {
              where: {
                term,
                student_id: user.student_id
              }
            });

            // 存入 Redis
            const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(query), 'EX', 300); // 5 分钟过期

            if (cache_update === 'OK') {
              // 缓存更新成功
              ctx.body = {
                code: 202,
                message: '考试列表获取成功',
                data: query
              };
            } else {
              // 缓存更新失败
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

  /**
   * 信息处理
   * @param {string} student_id 学号
   * @param {string} term 学期
   * @param {object} data 数据
   * @param {*} ctx ctx
   * @return {object} 返回 parse_data
   */
  async processData(student_id, term, data, ctx) {
    try {
      // 先删除数据库中原有的数据
      await ctx.app.mysql.delete('exam', {
        student_id,
        term
      });

      // 对获取到的数据进行处理并插入数据库
      const parse_data = [];
      const last_update = dayjs().unix();

      for (const item of data) {
        // 开始、结束时间戳处理
        const time = item.kssj;
        const time_date = time.split(' ')[0];
        const time_hour = time.split(' ')[1].split('~');
        const timestamp_start = dayjs(`${time_date} ${time_hour[0]}`).unix();
        const timestamp_end = dayjs(`${time_date} ${time_hour[1]}`).unix();

        // 数据处理
        const data = {
          id: item.id.toLowerCase(),
          name: item.kcmc,
          batch: item.kspcmc,
          type: item.ksfs,
          time,
          timestamp_start,
          timestamp_end,
          location: item.jsmc,
          seat: item.zwh,
          term,
          student_id,
          last_update
        };

        try {
          // 插入数据
          await ctx.app.mysql.insert('exam', data);
          parse_data.push(data);
        } catch (err) {
          // 数据库插入失败
          ctx.logger.error(err);

          ctx.body = {
            code: 500,
            message: '服务器内部错误'
          };
        }
      }

      return parse_data;
    } catch (err) {
      // 数据库删除失败
      ctx.logger.error(err);

      ctx.body = {
        code: 500,
        message: '服务器内部错误'
      };

      return false;
    }
  }
}

module.exports = ExamListController;
