// app/controller/timetable/class/search.js

const { Controller } = require('egg');
const cryptojs = require('crypto-js');

// 定义创建接口的请求参数规则
const createRule = {
  keyword: 'string'
};

class TimetableClassSearchController extends Controller {
  /**
   * 班级搜索
   */
  async index() {
    const { ctx } = this;

    // 参数校验
    ctx.validate(createRule, ctx.query);

    // 获取关键词
    const keyword = ctx.query.keyword;

    // 字符必须大于等于2
    if (keyword.length < 2) {
      ctx.body = {
        code: 403,
        message: '搜索字符必须大于等于2'
      };
      return;
    }

    // Redis Key
    const cache_key = `timetable_class_search_${cryptojs.MD5(keyword).toString()}`;

    // Redis 获取班级搜索缓存
    const cache = await ctx.app.redis.get(cache_key);

    if (cache) {
      // 存在缓存
      ctx.body = {
        code: 201,
        message: '班级搜索成功',
        data: JSON.parse(cache)
      };
    } else {
      // 不存在缓存，从数据库中获取并存入 Redis
      const result = await ctx.app.mysql.query('SELECT * FROM lesson WHERE classes LIKE ?', [`%${keyword}%`]);

      if (result.length > 0) {
        // 有结果
        const class_list = [];
        for (const lesson of result) {
          const classes = lesson.classes.split(',');

          for (const item of classes) {
            // 检查是否包含关键词
            if (item.includes(keyword)) {
              // 包含
              if (class_list.findIndex(value => value === item) !== -1) {
                // 存在
              } else {
                // 不存在，插入
                class_list.push(item);
              }
            }
          }
        }

        // 存入 Redis
        const data_sorted = class_list.sort();
        const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(data_sorted), 'EX', 86400); // 24 小时过期

        if (cache_update === 'OK') {
          // 存入成功
          ctx.body = {
            code: 200,
            message: '班级搜索成功',
            data: data_sorted
          };
        } else {
          // 存入失败
          ctx.body = {
            code: 500,
            message: '班级搜索缓存更新失败'
          };
        }
      } else {
        // 无结果
        ctx.body = {
          code: 200,
          message: '班级搜索成功',
          data: []
        };
      }
    }
  }
}

module.exports = TimetableClassSearchController;
