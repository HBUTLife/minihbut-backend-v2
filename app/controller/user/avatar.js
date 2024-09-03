// app/controller/user/avatar.js

const { Controller } = require('egg');
const dayjs = require('dayjs');

// 定义创建接口的请求参数规则
const createRule = {
  url: 'string'
};

class UserAvatarController extends Controller {
  /**
   * 上传头像
   */
  async upload() {}

  /**
   * 更新头像
   */
  async update() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.request.body);
    // 获取参数
    const url = ctx.request.body.url;
    // 验证图片链接是否为白名单内域名名下
    const domainWhitelist = ['stslb.com'];
    const isWhitelisted = domainWhitelist.some(domain => {
      const pattern = new RegExp(`^https?:\/\/([a-zA-Z0-9_-]+\\.)*${domain.replace('.', '\\.')}(\/|$)`);
      return pattern.test(url);
    });
    if (!isWhitelisted) {
      ctx.body = {
        code: 400,
        message: '图片链接不属于白名单域名'
      };
      return;
    }
    // 验证是否存在
    const testImage = await ctx.curl(url);
    if (testImage.status !== 200) {
      ctx.body = {
        code: 400,
        message: '链接图片不存在'
      };
      return;
    }
    // 验证是否为图片文件
    if (testImage.headers['content-type'].split('/')[0] !== 'image') {
      ctx.body = {
        code: 400,
        message: '文件类型不正确'
      };
      return;
    }
    // 初始化个人信息
    const user = ctx.user_info;
    // 更新时间
    const update_time = dayjs().unix();
    // 更新数据
    const hit = await ctx.app.mysql.update(
      'user',
      { avatar: url, update_time },
      { where: { student_id: user.student_id } }
    );
    if (hit.affectedRows === 1) {
      // 更新成功
      ctx.body = {
        code: 200,
        message: '头像更新成功',
        data: {
          student_id: user.student_id,
          avatar: url,
          update_time
        }
      };
    } else {
      // 更新失败
      ctx.body = {
        code: 500,
        message: '头像更新失败'
      };
    }
  }
}

module.exports = UserAvatarController;
