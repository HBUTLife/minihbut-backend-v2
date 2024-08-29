// app/controller/timetable/person/update.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  term: 'string'
};

class TimetablePersonUpdateController extends Controller {
  /**
   * 更新个人课表
   */
  async index() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.query);
    // 获取学期
    const term = ctx.query.term;
    // 初始化个人信息
    const user = ctx.user_info;
    // 请求更新课表服务
    const result = await ctx.service.timetable.update(user.student_id, term);
    if (result.status === 1) {
      // 更新成功
      ctx.body = {
        code: 200,
        message: '个人课表列表更新成功',
        data: result.data
      };
    } else if (result.status === 2) {
      // 更新成功，无数据
      ctx.body = {
        code: 200,
        message: '个人课表列表更新成功',
        data: []
      };
    } else if (result.status === 3) {
      // 登录过期，重新登录获取
      const reauth = await ctx.service.auth.idaas(user.student_id);
      if (reauth.code === 200) {
        // 重新授权成功重新执行
        await this.index();
      } else {
        // 重新授权失败
        ctx.body = reauth;
      }
    } else if (result.status === 4) {
      // 教务系统错误
      ctx.body = {
        code: 500,
        message: '教务系统出错无法更新课表'
      };
    }
  }
}

module.exports = TimetablePersonUpdateController;
