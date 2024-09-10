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

    // Redis Key
    const cache_key = `rank_${user.student_id}_${term}`;

    // Redis 获取排名信息
    const cache = await ctx.app.redis.get(cache_key);

    if (cache) {
      // 存在缓存
      ctx.body = {
        code: 201,
        message: '排名信息获取成功',
        data: JSON.parse(cache)
      };
    } else {
      // 不存在缓存
      try {
        // 从教务系统获取并存入数据库中
        const query = await ctx.app.mysql.select('user', {
          where: {
            student_id: user.student_id
          }
        });

        // 判断全学期
        if (term === '001') {
          term = '';
        }

        try {
          // 请求教务系统排名信息页面
          const request = await ctx.curl(ctx.app.config.jwxt.base + ctx.app.config.jwxt.rank, {
            method: 'GET',
            headers: {
              cookie: `uid=${query[0].jw_uid}; route=${query[0].jw_route}`
            },
            data: {
              xh: user.student_id,
              sznj: user.grade,
              xnxq: term
            },
            dataType: 'html',
            timeout: 15000 // 因加载较慢，设置 15 秒超时时间
          });

          if (request.status === 200) {
            // 获取成功
            const data = await this.processData(user.student_id, term, request.data);

            if (data.status === 1) {
              // 存入 Redis
              const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(data.data), 'EX', 300); // 5 分钟过期

              if (cache_update === 'OK') {
                // 更新成功
                ctx.body = {
                  code: 200,
                  message: '排名信息获取成功',
                  data: data.data
                };
              } else {
                // 更新失败
                ctx.body = {
                  code: 500,
                  message: '服务器内部错误'
                };
              }
            } else if (data.status === 2) {
              ctx.body = {
                code: 500,
                message: '服务器内部错误'
              };
            } else {
              ctx.body = {
                code: 500,
                message: '服务器内部错误'
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
          // 教务系统无法访问
          console.log(err);

          // 展示数据库内数据并存入 Redis
          let data;
          if (term !== '') {
            data = await ctx.app.mysql.select('rank', {
              where: {
                student_id: user.student_id,
                term
              }
            });
          } else {
            data = await ctx.app.mysql.select('rank', {
              where: {
                student_id: user.student_id,
                term: '001'
              }
            });
          }

          if (data.length > 0) {
            // 数据库内有数据，更新 Redis
            const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(data[0]), 'EX', 300); // 5 分钟过期

            if (cache_update === 'OK') {
              // 更新成功
              ctx.body = {
                code: 202,
                message: '排名信息获取成功',
                data: data[0]
              };
            } else {
              // 更新失败
              ctx.body = {
                code: 500,
                message: '服务器内部错误'
              };
            }
          } else {
            // 数据库内无数据
            ctx.body = {
              code: 202,
              message: '排名信息获取成功',
              data: {}
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
   * 排名信息处理
   * @param {string} student_id 学号
   * @param {string} term 学期
   * @param {object} data 数据
   * @return {object} 返回 status, data
   */
  async processData(student_id, term, data) {
    const { ctx } = this;

    // 判断全学期
    if (term === '') {
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
      student_id,
      term,
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
      student_id,
      term
    });

    if (count > 0) {
      // 数据库内有数据，更新数据
      const hit = await ctx.app.mysql.update('rank', parse_data, {
        where: {
          student_id,
          term
        }
      });

      if (hit.affectedRows === 1) {
        // 更新成功
        return {
          status: 1,
          data: parse_data
        };
      }
      // 更新失败
      return { status: 2 };
    }

    // 数据库内无数据，插入数据
    const hit = await ctx.app.mysql.insert('rank', parse_data);

    if (hit.affectedRows === 1) {
      // 插入成功
      return {
        status: 1,
        data: parse_data
      };
    }

    // 插入失败
    return { status: 3 };
  }
}

module.exports = RankListController;
