// app/schedule/update_lesson.js

const Subscription = require('egg').Subscription;
const dayjs = require('dayjs');

class UpdateLesson extends Subscription {
  // 通过 schedule 属性设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      cron: '0 0 4 * * *', // 每天 4 点执行
      type: 'worker' // 仅一个 worker 执行，避免重复执行
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    const { ctx } = this;

    try {
      // 获取登录凭证
      const query = await ctx.app.mysql.select('user', { where: { id: 1 } });

      // 重新授权登录避免用户已过期
      const auth = await ctx.service.auth.idaas(query[0].student_id);

      if (auth.code !== 200) {
        // 授权失败则停止更新
        return;
      }

      try {
        // 获取最新学期
        const query2 = await ctx.app.mysql.select('term', { orders: [['id', 'desc']] });
        const term = query2[0].name;

        try {
          // 首次请求获取总页数
          const enter = await ctx.curl(ctx.app.config.jwxt.base + ctx.app.config.jwxt.url.lesson, {
            headers: {
              cookie: `uid=${query[0].jw_uid}; route=${query[0].jw_route}`
            },
            data: {
              gridtype: 'jqgrid',
              'page.size': '50',
              'page.pn': '1',
              sort: 'kcmc',
              order: 'asc',
              xnxq: term
            },
            dataType: 'json'
          });

          if (enter.status === 200 && enter.data.total > 0) {
            // 获取成功且有数据
            await ctx.app.mysql.query('TRUNCATE TABLE lesson'); // 清空表 lesson

            // 遍历循环存入数据库
            const total_page = enter.data.totalPages; // 总页数
            for (let page = 1; page <= total_page; page++) {
              // 请求该页数据
              try {
                const request = await ctx.curl(ctx.app.config.jwxt.base + ctx.app.config.jwxt.url.lesson, {
                  headers: {
                    cookie: `uid=${query[0].jw_uid}; route=${query[0].jw_route}`
                  },
                  data: {
                    gridtype: 'jqgrid',
                    'page.size': '50',
                    'page.pn': page.toString(),
                    sort: 'kcmc',
                    order: 'asc',
                    xnxq: term
                  },
                  dataType: 'json'
                });

                if (request.status === 200 && request.data.results.length > 0) {
                  // 获取成功且有数据，进行处理和插入
                  await this.processData(request.data.results, ctx);
                }
              } catch (err) {
                // 请求失败，跳过该页
                ctx.logger.error(err);
                continue;
              }
            }

            ctx.logger.info('全校课表更新成功');
          }
        } catch (err) {
          // 教务系统出错不进行更新
          ctx.logger.error(err);
        }
      } catch (err) {
        // 数据库查询失败
        ctx.logger.error(err);
      }
    } catch (err) {
      // 数据库查询失败
      ctx.logger.error(err);
    }
  }

  // 处理数据
  async processData(data, ctx) {
    const last_update = dayjs().unix();
    const raw = data.map(item => ({
      term: item.xnxq, // 学期
      name: item.kcmc
        .replace(/<a href="javascript:void\(0\);" onclick="openKckb\('.*?'\)">/g, '')
        .replaceAll('</a>', '')
        .replace('（', '(')
        .replace('）', ')'), // 课程名称
      teacher: item.skjs
        ? item.skjs
            .replace(/<a href="javascript:void\(0\);" onclick="openJskb\('.*?','.*?'\)">/g, '')
            .replaceAll('</a>', '') // 教师名称
        : '',
      classes: item.jxbzc
        ? this.removeAllBrackets(
            item.jxbzc
              .replace(/<a href="javascript:void\(0\);" onclick="openBjkb\('.*?','.*?'\)">/g, '')
              .replaceAll('</a>', '')
          )
        : '', // 班级组成
      timeAndLocation: this.processTimeAndLocation(item.sksjdd) // 上课时间
    }));

    // 遍历本次请求的全部课程
    for (const item of raw) {
      // 遍历上课时间和地点，并将数据插入数据库
      for (const item2 of item.timeAndLocation) {
        // 插入数据库
        try {
          await ctx.app.mysql.insert('lesson', {
            term: item.term,
            name: item.name,
            location: item2.location,
            teacher: item.teacher,
            classes: item.classes,
            week: item2.week,
            day: item2.day,
            section: item2.section,
            last_update
          });
        } catch (err) {
          // 数据库插入失败，继续下一个迭代
          ctx.logger.error(err);
          continue;
        }
      }
    }
  }

  // 去除所有的括号及内容
  removeAllBrackets(str) {
    let result = str.replace(/\([^()]*\)/g, '');
    while (/\([^()]*\)/.test(result)) {
      result = result.replace(/\([^()]*\)/g, '');
    }
    return result;
  }

  // 处理上课时间和上课地点
  processTimeAndLocation(str) {
    const list = [];

    if (str.includes('; ')) {
      // 有1分隔符
      const part = str.split('; ');

      for (const item of part) {
        const get_location = item.match(/【(.*?)】/); // 获取上课地点
        const location = get_location ? get_location[1] : '无';
        const times = item.replace(/【.*?】/g, ''); // 除去上课地点剩下的内容

        if (times.includes(';')) {
          // 有2分隔符
          const arr = times.split(';');

          for (const item2 of arr) {
            list.push({ ...this.processTimeAndLocationPart(item2), location });
          }
        } else {
          // 无分隔符
          list.push({ ...this.processTimeAndLocationPart(times), location });
        }
      }
    } else {
      // 没有1分隔符
      const get_location = str.match(/【(.*?)】/); // 获取上课地点
      const location = get_location ? get_location[1] : '无';
      const times = str.replace(/【.*?】/g, ''); // 除去上课地点剩下的内容

      if (times.includes(';')) {
        // 有2分隔符
        const arr = times.split(';');

        for (const item of arr) {
          list.push({ ...this.processTimeAndLocationPart(item), location });
        }
      } else {
        list.push({ ...this.processTimeAndLocationPart(times), location });
      }
    }

    return list;
  }

  // 处理上课时间和地点的部分
  processTimeAndLocationPart(str) {
    const part = str.split(' ');

    return {
      week: this.processWeek(part[0].replace('第', '').replace('周', '')), // 逗号分隔字符串周次
      day: this.parseWeekDay(part[1]), // 整数星期
      section: this.parseRangeToList(part[2].replace('节', '')) // 逗号分隔字符串节次
    };
  }

  // 处理周次
  processWeek(str) {
    // 多个周次
    if (str.includes(',')) {
      const arr = str.split(',');

      const list = [];
      for (const item of arr) {
        list.push(this.parseWeekOddOrEven(item));
      }
      return list.join(',');
    }

    // 单个周次
    return this.parseWeekOddOrEven(str);
  }

  // 检测是否为单双周并对数据格式化
  parseWeekOddOrEven(str) {
    // 单周
    if (str.includes('单')) {
      return this.parseRangeToListOdd(str.replace('(单)', ''));
    }

    // 双周
    if (str.includes('双')) {
      return this.parseRangeToListEven(str.replace('(双)', ''));
    }

    // 非单双周
    return this.parseRangeToList(str);
  }

  // 格式化单周
  parseRangeToListOdd(str) {
    const [start, end] = str.split('-').map(Number); // 将起始和结束数字转换为整数
    const result = [];
    for (let i = start; i <= end; i++) {
      if (i % 2 !== 0) {
        // 判断是否为奇数
        result.push(i);
      }
    }
    return result.join(','); // 将数组转换为逗号分隔的字符串
  }

  // 格式化双周
  parseRangeToListEven(str) {
    const [start, end] = str.split('-').map(Number); // 将起始和结束数字转换为整数
    const result = [];
    for (let i = start; i <= end; i++) {
      if (i % 2 === 0) {
        // 判断是否为偶数
        result.push(i);
      }
    }
    return result.join(','); // 将数组转换为逗号分隔的字符串
  }

  // 格式化区间字符串为逗号分隔
  parseRangeToList(str) {
    // 单个数字
    if (/^\d+$/.test(str)) {
      return str;
    }

    // 非单个数字
    const [start, end] = str.split('-').map(Number);
    const result = [];
    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result.join(',');
  }

  // 转换文字星期为数字
  parseWeekDay(str) {
    const map = {
      星期一: 1,
      星期二: 2,
      星期三: 3,
      星期四: 4,
      星期五: 5,
      星期六: 6,
      星期日: 7
    };

    return map[str];
  }
}

module.exports = UpdateLesson;
