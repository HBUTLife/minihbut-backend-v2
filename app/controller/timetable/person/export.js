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
    // 查询是否已经生成过 Token
    const result = await ctx.app.mysql.select('timetable_export', {
      where: {
        term,
        student_id: user.student_id
      }
    });
    if (result.length > 0) {
      // 有数据，直接返回
      const data = result[0];
      delete data.id;
      ctx.body = {
        code: 202,
        message: '个人课表导出成功',
        data
      };
    } else {
      // 没有数据，检查数据库内是否有该学期课表
      const timetable = await ctx.app.mysql.select('timetable', {
        where: {
          term,
          student_id: user.student_id
        }
      });
      if (timetable.length === 0) {
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
      const hit = await ctx.app.mysql.insert('timetable_export', data);
      if (hit.affectedRows === 1) {
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
          message: '个人课表导出失败'
        };
      }
    }
  }
}

module.exports = TimetablePersonExportController;
