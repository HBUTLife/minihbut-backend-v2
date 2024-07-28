// app/controller/score/list.js

const { Controller } = require('egg');

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
    // 获取登录信息
    const pass = await ctx.app.mysql.select('user', {
      where: {
        student_id: user.student_id
      }
    });

    try {
      // 成绩获取地址
      const score_base_url = ctx.app.config.jwxt.base + ctx.app.config.jwxt.score;
      const score_url = `${score_base_url}?page.size=300&page.pn=1&startXnxq=${term}&endXnxq=${term}`;
      const result = await ctx.curl(score_url, {
        method: 'GET',
        headers: {
          cookie: `uid=${pass[0].jw_uid}; route=${pass[0].jw_route}`
        },
        dataType: 'json'
      });

      if (result.status === 200) {
        // 获取成功
        let data = [];
        if (result.data.total > 0) {
          data = await this.processData(user.student_id, term, result.data.results);
        }
        ctx.body = {
          code: 200,
          message: '成绩列表获取成功',
          data
        };
      } else {
        // 登录过期，重新登录获取
        const reauth = await ctx.service.auth.idaas(user.student_id);
        if (reauth) {
          // 重新授权成功重新执行
          await this.index();
        } else {
          // 重新授权失败
          ctx.body = {
            code: 401,
            message: '重新授权失败'
          };
        }
      }
    } catch (err) {
      // 教务系统无法访问，展示数据库内数据
      let data;
      if (term === '001') {
        // 全学期
        data = await ctx.app.mysql.select('score', {
          where: {
            student_id: user.student_id
          }
        });
      } else {
        // 指定学期
        data = await ctx.app.mysql.select('score', {
          where: {
            term,
            student_id: user.student_id
          }
        });
      }

      ctx.body = {
        code: 201,
        message: '成绩列表获取成功',
        data
      };
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
    // 判断是否为全学期，先删除数据库中原有的数据
    if (term === '001') {
      // 是
      await ctx.app.mysql.delete('score', {
        student_id
      });
    } else {
      // 否
      await ctx.app.mysql.delete('score', {
        student_id,
        term
      });
    }
    // 对获取到的数据进行处理并插入数据库
    const parse_data = [];
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
        score: parseInt(item.yscj),
        detail: item.cjfxms,
        term: item.xnxq,
        student_id
      };
      // 插入成绩
      await ctx.app.mysql.insert('score', data);
      parse_data.push(data);
    }

    return parse_data;
  }
}

module.exports = ScoreListController;
