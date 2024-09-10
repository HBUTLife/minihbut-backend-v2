// app/controller/timetable/person/export.js

const { Controller } = require('egg');
const cryptojs = require('crypto-js');
const dayjs = require('dayjs');

// 定义创建接口的请求参数规则
const createRule = {
  term: 'string'
};

class TimetablePersonExportController extends Controller {
  /**
   * 个人课表导出
   */
  async index() {
    const { ctx } = this;

    // 参数校验
    ctx.validate(createRule, ctx.query);

    // 获取学期
    const term = ctx.query.term;

    // 初始化个人信息
    const user = ctx.user_info;

    try {
      // 查询是否已经生成过 Token
      const query = await ctx.app.mysql.select('timetable_export', {
        where: {
          term,
          student_id: user.student_id
        }
      });

      if (query.length > 0) {
        // 有数据，直接返回
        const data = query[0];
        delete data.id;

        ctx.body = {
          code: 202,
          message: '个人课表导出成功',
          data
        };
      } else {
        try {
          // 没有数据，检查数据库内是否有该学期课表
          const query2 = await ctx.app.mysql.select('timetable', {
            where: {
              term,
              student_id: user.student_id
            }
          });

          if (query2.length === 0) {
            // 没有该学期课表，不生成token
            ctx.body = {
              code: 404,
              message: '未找到该学期课表，请尝试更新课表后再导出'
            };
            return;
          }

          const token = cryptojs.MD5(`${user.student_id}_${term}_${dayjs().unix()}`).toString(); // 生成 Token

          const data = {
            term,
            token,
            student_id: user.student_id
          };

          try {
            // 插入数据
            const insert = await ctx.app.mysql.insert('timetable_export', data);

            if (insert.affectedRows === 1) {
              // 插入成功
              ctx.body = {
                code: 200,
                message: '个人课表导出成功',
                data
              };
            } else {
              // 插入失败
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

module.exports = TimetablePersonExportController;
