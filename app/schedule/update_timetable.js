// app/schedule/update_timetable.js

const Subscription = require('egg').Subscription;

class UpdateTimetable extends Subscription {
  // 通过 schedule 属性设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      cron: '0 0 3 * * *', // 每天 3 点执行
      type: 'all'
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    const { ctx } = this;
    // 获取所有用户
    const user = await ctx.app.mysql.select('user');
    // 遍历所有用户一个个更新课表
    for (const item of user) {
      // 先更新一次 uid route
      const auth = await ctx.service.auth.idaas(item.student_id);
      console.log(auth);
      if (auth) {
        // 认证成功，更新课表
        const update = await ctx.service.timetable.update(item.student_id, '2023-2024-2');
        if (update.status === 4) {
          // 教务系统出错，退出 for 循环
          break;
        }
      } else {
        // 认证失败，下一位
        continue;
      }
    }
  }
}

module.exports = UpdateTimetable;
