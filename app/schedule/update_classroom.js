// app/schedule/update_classroom.js

const Subscription = require('egg').Subscription;
const dayjs = require('dayjs');

class UpdateClassroom extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      cron: '0 0 4 * * *', // 每日 4 点执行
      type: 'all'
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    const { ctx } = this;
    // 定义 log 信息
    let log = {
      event: 'update_classroom',
      time: dayjs().unix(),
      status: '',
      detail: ''
    };
    // 获取账号
    const pass = await ctx.app.mysql.select('user', {
      where: {
        student_id: '2210652202'
      }
    });

    try {
      const classroom_base_url = ctx.app.config.jwxt.base + ctx.app.config.jwxt.classroom;
      const classroom_url = `${classroom_base_url}?gridtype=jqgrid&sort=id&order=asc&type=1&page.size=500&page.pn=1`;
      const result = await ctx.curl(classroom_url, {
        method: 'GET',
        headers: {
          'cookie': `uid=${pass[0].jw_uid}; route=${pass[0].jw_route}`
        },
        dataType: 'json'
      });

      if(result.status === 200) {
        // 获取成功
        await this.processData(result.data.results);
        log.status = 'success';
        log.detail = 'Classroom updated.';
      } else {
        // 登录过期，重新登录获取
        const reauth = await ctx.service.auth.re(user.student_id);
        if(reauth) {
          // 重新授权成功重新执行
          await this.subscribe();
        } else {
          // 重新授权失败
          log.status = 'failed';
          log.detail = 'Reauth failed.';
        }
      }
    } catch(err) {
      // 教务系统无法访问，则不进行更新
      log.status = 'failed';
      log.detail = 'School system connect failed.'
    }
    // 上传 log
    await ctx.app.mysql.insert('schedule_log', log);
  }

  /**
   * 空教室信息处理
   * @param {object} data 
   */
  async processData(data) {
    const { ctx } = this;
    // 先清空数据库内拥有的所有数据
    await ctx.app.mysql.delete('classroom');
    // 遍历插入数据
    data.forEach(async item => {
      await ctx.app.mysql.insert('classroom', {
        id: parseInt(item.id),
        name: item.jsmc,
        type: item.jslx,
        seat: item.zdskrnrs
      });
    });
  }
}

module.exports = UpdateClassroom;
