// app/controller/statistic/search.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  keyword: 'string'
};

class StatisticSearchController extends Controller {
  /**
   * 给分统计查询方法
   */
  async index() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.query);
    // 获取关键词
    const keyword = ctx.query.keyword;
    // 查询
    const result = await this.app.mysql.query('SELECT * FROM score WHERE name LIKE ? OR teacher LIKE ?', [`%${keyword}%`, `%${keyword}%`]);
    // 遍历查重并格式化
    let search_list = [];
    result.forEach(item => {
      const count = search_list.filter(ele => ele.name === item.name && ele.teacher === item.teacher);
      if(count.length === 0) {
        // 不存在则添加
        search_list.push({
          name: item.name,
          teacher: item.teacher
        });
        return;
      }
    });

    ctx.body = {
      code: 200,
      message: '列表查询成功',
      data: search_list
    };
  }
}

module.exports = StatisticSearchController;
