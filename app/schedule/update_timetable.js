// app/schedule/update_timetable.js

const Subscription = require('egg').Subscription;

class UpdateTimetable extends Subscription {
  // 通过 schedule 属性设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      cron: '0 0 3 * * *', // 每天 3 点执行
      type: 'worker' // 仅一个 worker 执行，避免重复执行
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    const { ctx } = this;

    try {
      // 获取最新学期
      const terms = await ctx.app.mysql.select('term', { orders: [['id', 'desc']] });
      const term = terms[0].name;

      try {
        // 获取所有用户
        const user = await ctx.app.mysql.select('user');

        // 遍历所有用户一个个更新课表
        for (const item of user) {
          // 先更新一次 uid route
          const auth = await ctx.service.auth.idaas(item.student_id, 1);

          if (auth.code === 200) {
            // 认证成功，更新课表
            const update = await ctx.service.timetable.update(item.student_id, term);

            if (update.status === 4) {
              // 教务系统出错，退出循环
              break;
            }
          } else {
            // 认证失败，下一位
            ctx.logger.error(`更新课表失败：${item.student_id}`);
            continue;
          }
        }

        ctx.logger.info('用户个人课表更新成功');
      } catch (err) {
        // 数据库查询失败
        ctx.logger.error(err);
      }
    } catch (err) {
      // 数据库查询失败
      ctx.logger.error(err);
    }
  }
}

module.exports = UpdateTimetable;
