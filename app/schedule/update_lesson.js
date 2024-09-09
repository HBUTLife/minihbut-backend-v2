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
    // 获取登录凭证
    const pass = await ctx.app.mysql.select('user', { where: { id: 1 } });
    // 重新授权登录避免用户已过期
    const auth = await ctx.service.auth.idaas(pass[0].student_id);
    if (auth.code !== 200) {
      // 授权失败则停止更新
      return;
    }

    // 获取最新学期
    const terms = await ctx.app.mysql.select('term', { orders: [['id', 'desc']] });
    const term = terms[0].name;

    try {
      // 首次请求获取总页数
      const enter = await ctx.curl(
        ctx.app.config.jwxt.base +
          ctx.app.config.jwxt.lesson +
          `?gridtype=jqgrid&page.size=50&page.pn=1&sort=kcmc&order=asc&xnxq=${term}`,
        {
          headers: {
            cookie: `uid=${pass[0].jw_uid}; route=${pass[0].jw_route}`
          },
          dataType: 'json'
        }
      );
      if (enter.status === 200 && enter.data.total > 0) {
        // 获取成功且有数据
        await ctx.app.mysql.query('TRUNCATE TABLE lesson'); // 清空表 lesson
        // 遍历循环存入数据库
        const total_page = enter.data.totalPages; // 总页数
        for (let page = 1; page <= total_page; page++) {
          // 请求该页数据
          const result = await ctx.curl(
            ctx.app.config.jwxt.base +
              ctx.app.config.jwxt.lesson +
              `?gridtype=jqgrid&page.size=50&page.pn=${page}&sort=kcmc&order=asc&xnxq=${term}`,
            {
              headers: {
                cookie: `uid=${pass[0].jw_uid}; route=${pass[0].jw_route}`
              },
              dataType: 'json'
            }
          );
          if (result.status === 200 && result.data.results.length > 0) {
            // 获取成功且有数据，进行处理和插入
            await this.processData(result.data.results);
          }
        }
      }
    } catch (err) {
      // 教务系统出错不进行更新
      console.log(err);
    }
  }

  // range
  range(arr) {
    if (arr.length === 1) {
      arr = [...arr, ...arr];
    }
    const [start, end] = arr.map(item => Number(item));
    return Array.from({ length: end - start + 1 }, (_, i) => i + start);
  }

  // 判断是否为周次
  isWeek(value) {
    return /^第.*周$/.test(value);
  }

  // 判断是否为星期
  isDay(value) {
    return /^星期/.test(value);
  }

  // 判断是否为节次
  isSection(value) {
    return /节$/.test(value);
  }

  // 获取周次
  getWeek(value) {
    return value
      .replace('第', '')
      .replace('周', '')
      .split(',')
      .map(item => this.range(item.split('-')))
      .flat();
  }

  // 获取星期
  getDay(value) {
    const days = {
      星期一: 1,
      星期二: 2,
      星期三: 3,
      星期四: 4,
      星期五: 5,
      星期六: 6,
      星期日: 7
    };
    return days[value];
  }

  // 获取节次
  getSelection(value) {
    return this.range(value.replace('节', '').split('-'));
  }

  // 处理
  handle(timeAndPlace) {
    let arr = timeAndPlace.split(' ');
    arr = arr.map(item => {
      if (this.isWeek(item)) {
        // 处理周次
        return this.getWeek(item);
      } else if (this.isDay(item)) {
        // 处理星期
        return this.getDay(item);
      } else if (this.isSection(item)) {
        // 处理节次
        return this.getSelection(item);
      }
      // 上课地点直接返回
      return item;
    });

    // 处理数组，插入上课地点，返回 length 为 4 的倍数的数组
    let left = 0;
    let right = 1;
    while (right < arr.length) {
      if (typeof arr[right - 1] === 'number' && typeof arr[right + 1] === 'object' && left === 0) {
        left = right + 1;
        right++;
      } else if (typeof arr[right] === 'string' && left !== 0) {
        arr.splice(left, 0, arr[right]);
        right = left + 1;
        left = 0;
      } else {
        right++;
      }
    }

    return arr;
  }

  // 去除所有的括号及内容
  removeAllBrackets(str) {
    let result = str.replace(/\([^()]*\)/g, '');
    while (/\([^()]*\)/.test(result)) {
      result = result.replace(/\([^()]*\)/g, '');
    }
    return result;
  }

  // 处理数据
  async processData(data) {
    const { ctx } = this;
    const last_update = dayjs().unix();
    const raw = data.map(item => ({
      name: item.kcmc
        .replace(/<a href="javascript:void\(0\);" onclick="openKckb\('.*?'\)">/g, '')
        .replaceAll('</a>', ''),
      teacher: item.skjs
        ? item.skjs
            .replace(/<a href="javascript:void\(0\);" onclick="openJskb\('.*?','.*?'\)">/g, '')
            .replaceAll('</a>', '')
        : '',
      classes: item.jxbzc
        ? this.removeAllBrackets(
            item.jxbzc
              .replace(/<a href="javascript:void\(0\);" onclick="openBjkb\('.*?','.*?'\)">/g, '')
              .replaceAll('</a>', '')
          )
        : '',
      term: item.xnxq,
      timeAndPlace: this.handle(item.sksjdd)
    }));

    for (const item of raw) {
      for (let i = 0; i < item.timeAndPlace.length; i += 4) {
        try {
          // 写入数据库
          await ctx.app.mysql.insert('lesson', {
            name: item.name.replace('（', '(').replace('）', ')'),
            location: item.timeAndPlace[i + 3].replace('【', '').replace('】', '').replace(';', ''),
            teacher: item.teacher,
            classes: item.classes.replace('...', ''),
            week: item.timeAndPlace[i].toString(),
            day: item.timeAndPlace[i + 1],
            section: item.timeAndPlace[i + 2].toString(),
            term: item.term,
            last_update
          });
        } catch (err) {
          // 丢出报错
          console.log(err);
        }
      }
    }
  }
}

module.exports = UpdateLesson;
