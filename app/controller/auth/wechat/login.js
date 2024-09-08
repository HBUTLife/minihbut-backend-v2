// app/controller/auth/wechat/login.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  js_code: 'string'
};

class AuthWechatLoginController extends Controller {
  /**
   * 微信登录方法
   */
  async index() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.request.body);
    // 获取参数
    const js_code = ctx.request.body.js_code;

    try {
      const url = `${ctx.app.config.wechat.api_url}?appid=${ctx.app.config.wechat.app_id}&secret=${ctx.app.config.wechat.app_secret}&js_code=${js_code}&grant_type=authorization_code`;
      const result = await ctx.curl(url, {
        method: 'GET',
        dataType: 'json'
      });

      if (result.data.openid) {
        // 获取成功，与数据库内数据进行比对
        const hit = await ctx.app.mysql.select('user', {
          where: {
            wx_openid: result.data.openid
          }
        });

        if (hit.length > 0) {
          // 有绑定用户，进行登录
          const user = hit[0];
          const info = {
            student_id: user.student_id,
            name: user.name,
            college: user.college,
            class: user.class,
            major: user.major,
            grade: user.grade,
            grade_enter: user.grade_enter
          };

          ctx.body = {
            code: 200,
            message: '微信登录成功',
            data: {
              info,
              token: this.signToken(info)
            }
          };
        } else {
          // 未绑定用户，返回信息
          ctx.body = {
            code: 404,
            message: '未找到绑定的用户'
          };
        }
      } else {
        // 获取失败
        ctx.body = {
          code: 401,
          message: '未能成功获取OpenID'
        };
      }
    } catch (err) {
      // 服务器连接微信接口失败
      console.log(err);

      ctx.body = {
        code: 500,
        message: '微信接口请求失败'
      };
    }
  }

  /**
   * 签名token
   * @param {object} payload 载荷
   * @return {string} token
   */
  signToken(payload) {
    const { ctx } = this;
    return ctx.app.jwt.sign(payload, ctx.app.config.jwt.secret, ctx.app.config.jwt.expiresIn);
  }
}

module.exports = AuthWechatLoginController;
