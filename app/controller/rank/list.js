// app/controller/rank/list.js

const { Controller } = require('egg');
const cheerio = require('cheerio');
const dayjs = require('dayjs');

// 定义创建接口的请求参数规则
const createRule = {
  term: 'string'
};

class RankListController extends Controller {
  /**
   * 排名查询方法
   */
  async index() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.query);
    // 获取学期
    let term = ctx.query.term;
    // 初始化个人信息
    const user = ctx.user_info;
    // 获取登录信息
    const pass = await ctx.app.mysql.select('user', {
      where: {
        student_id: user.student_id
      }
    });
    // 判断全学期
    if(term === '001') {
      term = '';
    }

    try {
      const rank_base_url = ctx.app.config.jwxt.base + ctx.app.config.jwxt.rank;
      const rank_url = `${rank_base_url}?xh=${user.student_id}&sznj=${user.grade}&xnxq=${term}`;
      const result = await ctx.curl(rank_url, {
        method: 'GET',
        headers: {
          'cookie': `uid=${pass[0].jw_uid}; route=${pass[0].jw_route}`
        },
        dataType: 'html'
      });

      console.log(result);

      if(result.status === 200) {
        // 获取成功
        const data = await this.processData(user.student_id, term, result.data);
        if(data.status === 1) {
          ctx.body = {
            code: 200,
            message: '排名列表获取成功',
            data: data.data
          };
        } else if(data.status === 2) {
          ctx.body = {
            code: 500,
            message: '排名更新失败'
          };
        } else {
          ctx.body = {
            code: 500,
            message: '排名插入失败'
          };
        }
      } else {
        // 登录过期，重新登录获取
        const reauth = await ctx.service.auth.re(user.student_id);
        if(reauth) {
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
    } catch(err) {
      // 教务系统无法访问，展示数据库内数据
      const data = await ctx.app.mysql.select('rank', {
        where: {
          student_id: user.student_id,
          term: term
        }
      });

      ctx.body = {
        code: 201,
        message: '排名列表获取成功',
        data: data
      };
    }
  }

  /**
   * 排名信息处理
   * @param {string} student_id 
   * @param {string} term 
   * @param {object} data 
   * @returns 
   */
  async processData(student_id, term, data) {
    const { ctx } = this;
    // 判断全学期
    if(term === '') {
      term = '001';
    }
    // 使用 Cheerio 加载 HTML 字符串
    const $ = cheerio.load(data.toString());
    // 选择所有 <td> 标签
    const tdElements = $('td');
    // 创建一个数组来存储提取的内容
    const tdContents = [];
    // 循环遍历所有<td>标签，并将其内容添加到数组中
    tdElements.each((index, element) => {
      const content = $(element).text().trim();
      tdContents.push(content);
    });
    // 格式化数据
    const parse_data = {
      student_id: student_id,
      term: term,
      average_grade_point: tdContents[6].replace('平均学分绩点：', '').replace('    ', ''),
      average_score: tdContents[7].replace('算术平均分：', ''),
      grade_point_college: tdContents[10],
      grade_point_major: tdContents[11],
      grade_point_class: tdContents[12],
      score_college: tdContents[14],
      score_major: tdContents[15],
      score_class: tdContents[16],
      last_update: dayjs().unix()
    };
    // 检测是否存在数据
    const count = await ctx.app.mysql.count('rank', {
      student_id: student_id,
      term: term
    });
    
    if(count > 0) {
      // 数据库内有数据，更新数据
      const hit = await ctx.app.mysql.update('rank', parse_data, {
        where: {
          student_id: student_id,
          term: term
        }
      });

      if(hit.affectedRows === 1) {
        // 更新成功
        return {
          status: 1,
          data: parse_data
        };
      } else {
        // 更新失败
        return { status: 2 };
      }
    } else {
      // 数据库内无数据，插入数据
      const hit = await ctx.app.mysql.insert('rank', parse_data);
      
      if(hit.affectedRows === 1) {
        // 插入成功
        return {
          status: 1,
          data: parse_data
        };
      } else {
        // 插入失败
        return { status: 3 };
      }
    }
  }
}

module.exports = RankListController;
