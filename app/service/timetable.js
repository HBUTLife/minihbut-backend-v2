// app/service/timetable.js

const Service = require('egg').Service;
const dayjs = require('dayjs');

class TimetableService extends Service {
  /**
   * 更新课表方法
   * @param {string} student_id 学号
   * @param {*} term 学期
   * @return {object} status, data
   */
  async update(student_id, term) {
    const { ctx } = this;
    // 获取教务系统用户凭证
    const pass = await ctx.app.mysql.select('user', {
      where: {
        student_id
      }
    });

    try {
      const timetable_base_url = ctx.app.config.jwxt.base + ctx.app.config.jwxt.timetable;
      const timetable_url = `${timetable_base_url}?xnxq=${term}&xhid=${pass[0].jw_id}`;
      const result = await ctx.curl(timetable_url, {
        headers: {
          cookie: `uid=${pass[0].jw_uid}; route=${pass[0].jw_route}`
        },
        dataType: 'json'
      });
      if (result.status === 200) {
        // 获取成功
        if (result.data.length > 0) {
          // 有数据，更新 MySQL 和 Redis
          const data = await this.databaseUpdate(student_id, term, result.data); // 写入 MySQL 并获取原始课表
          const custom = await this.cacheUpdate(student_id, term, data); // 写入 Redis 并获取自定义课表
          const final_data = data.concat(custom);
          return {
            status: 1,
            data: final_data
          };
        }
        // 无数据
        return { status: 2 };
      }
      // uid route 已过期
      return { status: 3 };
    } catch (err) {
      // 教务系统无法访问
      console.log(err);
      return { status: 4 };
    }
  }

  /**
   * 写入数据库
   * @param {string} student_id 学号
   * @param {string} term 学期
   * @param {object} data 原始数据
   * @return {object} 处理后数据
   */
  async databaseUpdate(student_id, term, data) {
    const { ctx } = this;
    const parse_data = [];
    const last_update = dayjs().unix();
    // 首次遍历节次合并
    for (const item of data) {
      const found_index = parse_data.findIndex(
        value =>
          value.name === item.kcmc &&
          value.location === item.croommc &&
          value.teacher === item.tmc &&
          value.week === item.zcstr &&
          value.day === item.xq
      );
      if (found_index !== -1) {
        // 新数组存在则修改节次
        parse_data[found_index].section += `,${item.djc.toString()}`;
      } else {
        // 新数组不存在则插入
        parse_data.push({
          id: item.pkid.toLowerCase(),
          name: item.kcmc,
          location: item.croommc,
          teacher: item.tmc,
          week: item.zcstr,
          day: item.xq,
          section: item.djc.toString(),
          term: item.xnxq,
          student_id,
          last_update
        });
      }
    }
    // 删除数据库内原有数据
    await ctx.app.mysql.delete('timetable', {
      term,
      student_id
    });
    // 二次遍历格式化数据并插入数据库
    for (const item of parse_data) {
      // 格式化课程名称
      item.name = item.name
        .replace(/<a href="javascript:void\(0\);" onclick="openKckb\('.*?'\)">/g, '')
        .replace('</a>', '');
      // 格式化上课地点
      item.location = item.location
        .replace(/<a href="javascript:void\(0\);" onclick="openCrkb\('.*?','.*?'\)">/g, '')
        .replace('</a>', '');
      // 格式化教师
      item.teacher = item.teacher
        .replaceAll(/<a href="javascript:void\(0\);" onclick="openJskb\('.*?','.*?'\)">/g, '')
        .replaceAll('</a>', '');
      // 插入数据
      await ctx.app.mysql.insert('timetable', item);
    }
    // 返回处理完数据
    return parse_data;
  }

  /**
   * 写入缓存
   * @param {string} student_id 学号
   * @param {string} term 学期
   * @param {object} data 处理后数据
   * @return {object} 自定义课程列表
   */
  async cacheUpdate(student_id, term, data) {
    const { ctx } = this;
    // 获取自定义课程列表
    const custom = await ctx.app.mysql.select('timetable_custom', {
      where: {
        term,
        student_id
      }
    });
    // 将自定义课程加入课表列表
    const final_data = data.concat(custom);
    // 写入 Redis
    await ctx.app.redis.set(`timetable_person_${student_id}_${term}`, JSON.stringify(final_data), 'EX', 604800); // 7 天过期
    // 返回自定义课程列表
    return custom;
  }
}

module.exports = TimetableService;
