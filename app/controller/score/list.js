// app/controller/score/list.js

const { Controller } = require('egg');
const dayjs = require('dayjs');

// 定义创建接口的请求参数规则
const createRule = {
  term: 'string'
};

class ScoreListController extends Controller {
  /**
   * 成绩查询方法
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
    const cache_key = `score_${user.student_id}_${term}`;

    // Redis 获取成绩列表
    const cache = await ctx.app.redis.get(cache_key);

    if (cache) {
      // 存在缓存
      ctx.body = {
        code: 201,
        message: '成绩列表获取成功',
        data: JSON.parse(cache)
      };
    } else {
      // 不存在缓存，从教务系统获取并更新
      const pass = await ctx.app.mysql.select('user', {
        where: {
          student_id: user.student_id
        }
      });

      try {
        // 成绩获取地址
        const request = await ctx.curl(ctx.app.config.jwxt.base + ctx.app.config.jwxt.score, {
          method: 'GET',
          headers: {
            cookie: `uid=${pass[0].jw_uid}; route=${pass[0].jw_route}`
          },
          data: {
            'page.size': '300',
            'page.pn': '1',
            startXnxq: term,
            endXnxq: term
          },
          dataType: 'json'
        });

        if (request.status === 200) {
          // 获取成功
          if (request.data.total > 0) {
            // 有数据
            const data = await this.processData(user.student_id, term, request.data.results);

            // 写入 Redis
            const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(data), 'EX', 300); // 5 分钟过期

            if (cache_update === 'OK') {
              // 更新成功
              ctx.body = {
                code: 200,
                message: '成绩列表获取成功',
                data
              };
            } else {
              // 更新失败
              ctx.body = {
                code: 500,
                message: '服务器内部错误'
              };
            }
          } else {
            // 无数据
            ctx.body = {
              code: 200,
              message: '成绩列表获取成功',
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
        // 教务系统无法访问，展示数据库内数据
        ctx.logger.error(err);

        const where = { student_id: user.student_id };
        if (term !== '001') {
          where.term = term;
        }

        try {
          // 数据库查询成绩列表
          const data = await ctx.app.mysql.select('score', { where });

          if (data.length > 0) {
            // 有数据，写入 Redis
            const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(data), 'EX', 300); // 5 分钟过期

            if (cache_update === 'OK') {
              // 更新成功
              ctx.body = {
                code: 202,
                message: '成绩列表获取成功',
                data
              };
            } else {
              // 更新失败
              ctx.body = {
                code: 500,
                message: '服务器内部错误'
              };
            }
          } else {
            // 无数据
            ctx.body = {
              code: 202,
              message: '成绩列表获取成功',
              data: []
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
  }

  /**
   * 成绩信息处理
   * @param {string} student_id 学号
   * @param {string} term 学期
   * @param {object} data 数据
   * @return {object} 格式化后数据
   */
  async processData(student_id, term, data) {
    const { ctx } = this;

    // 判断是否为全学期
    const where = { student_id };
    if (term !== '001') {
      where.term = term;
    }

    try {
      // 删除原有数据
      await ctx.app.mysql.delete('score', where);

      // 对获取到的数据进行处理并插入数据库
      const parse_data = [];
      const last_update = dayjs().unix();

      for (const item of data) {
        const data = {
          id: item.id.toLowerCase(),
          name: item.kcmc
            .replace(/\[[^\]]*\]/g, '')
            .replace('（', '(')
            .replace('）', ')'),
          course_id: item.kcid,
          teacher: item.cjlrjsxm,
          type: item.kcxz,
          study_type: item.xdxz,
          exam_type: item.ksxs,
          credit: item.xf,
          student_credit: item.hdxf.toString(),
          score: parseInt(item.yscj ? item.yscj : item.zhcj === '不及格' ? '0' : item.zhcj),
          detail: item.cjfxms,
          term: item.xnxq,
          student_id,
          last_update
        };

        try {
          // 插入成绩至数据库
          await ctx.app.mysql.insert('score', data);

          // 插入返回
          parse_data.push(data);
        } catch (err) {
          // 报错
          ctx.logger.error(err);

          // 跳过继续循环
          continue;
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

module.exports = ScoreListController;
