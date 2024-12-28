// app/controller/user/avatar.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  url: 'string'
};

class UserAvatarController extends Controller {
  async index() {
    const { ctx } = this;

    // 参数校验
    ctx.validate(createRule, ctx.request.body);

    // 初始化个人信息
    const user = ctx.user_info;

    // 获取参数
    const url = ctx.request.body.url; // 头像链接

    // 检验链接
    if (!this.checkDomain(url)) {
      ctx.body = {
        code: 400,
        message: '链接不在白名单内'
      };
      return;
    }

    // 更新信息
    const query = await ctx.app.mysql.update('user', { avatar: url }, { where: { student_id: user.student_id } });
    if (query.affectedRows === 1) {
      // 更新成功
      await ctx.app.redis.del(`user_info_${user.student_id}`);
      ctx.body = {
        code: 200,
        message: '头像更新成功',
        data: {
          avatar: url
        }
      };
      return;
    }

    // 更新失败
    ctx.body = {
      code: 500,
      message: '服务器内部错误'
    };
  }

  /**
   * 检测链接域名
   * @param {string} url 链接
   * @return {boolean} 是否是白名单中链接
   */
  checkDomain(url) {
    // 域名白名单
    const whitelist = ['img.stslb.com'];

    // 检验
    const parsedUrl = new URL(url);
    return whitelist.includes(parsedUrl.hostname);
  }
}

module.exports = UserAvatarController;
