// app/service/auth.js

const Service = require('egg').Service;
const dayjs = require('dayjs');
const cryptojs = require('crypto-js');
const tripledes = require('crypto-js/tripledes');

class AuthService extends Service {
  /**
   * 统一身份认证更新方法
   * @param {string} username 用户名
   * @return {object} 状态和信息
   */
  async idaas(username) {
    const { ctx } = this;

    // 数据库查询用户信息
    const query = await ctx.app.mysql.select('user', {
      where: {
        student_id: username
      }
    });

    // 获取并解密密码
    const password = tripledes.decrypt(query[0].password, ctx.app.config.encryption.secret).toString(cryptojs.enc.Utf8);

    try {
      // 请求统一身份认证接口获取 access_token, refresh_token, locale
      const idaas = await ctx.curl(ctx.app.config.idaas.base + ctx.app.config.idaas.login, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        data: { username, password }
      });

      if (idaas.status === 200) {
        // 统一身份认证登录成功
        const idaas_cookies = idaas.headers['set-cookie'].map(cookie => cookie.split(';')[0]);

        // 请求登录教务系统
        const login = await this.tryLogin(ctx.app.config.idaas.base + ctx.app.config.idaas.sso, idaas_cookies, ctx);

        if (login.some(item => item.startsWith('uid=')) && login.some(item => item.startsWith('route='))) {
          // 登录成功
          const cookie_uid = login.find(item => item.startsWith('uid='));
          const cookie_route = login.find(item => item.startsWith('route='));

          try {
            const update = await ctx.app.mysql.update(
              'user',
              {
                jw_uid: cookie_uid.replace('uid=', ''),
                jw_route: cookie_route.replace('route=', ''),
                update_time: dayjs().unix()
              },
              {
                where: {
                  student_id: username
                }
              }
            );
            if (update.affectedRows === 1) {
              // 更新成功
              return {
                code: 200,
                message: '重新授权成功重新执行'
              };
            }

            // 更新失败
            return {
              code: 500,
              message: '服务器内部错误'
            };
          } catch (err) {
            ctx.logger.error(err);
            return {
              code: 500,
              message: '服务器内部错误'
            };
          }
        }

        // 教务系统登录过程中遇到错误
        return {
          code: 503,
          message: '教务系统接口请求失败'
        };
      }

      // 统一身份认证密码错误或其他错误
      return {
        code: 401,
        message: '密码已被更改'
      };
    } catch (err) {
      // 统一身份认证认证请求失败
      ctx.logger.error(err);

      return {
        code: 503,
        message: '统一身份认证系统接口请求失败'
      };
    }
  }

  /**
   * 尝试登录并返回登录过程中所有 Cookie
   * @param {string} first_url 第一次请求 URL
   * @param {object} first_cookies 第一次请求 Cookies
   * @param {*} ctx ctx
   * @return {*} 返回 Cookies 或者 false
   */
  async tryLogin(first_url, first_cookies, ctx) {
    let cookies = [...first_cookies];
    let success = true; // 标记请求是否成功

    const tryRequest = async url => {
      try {
        const request = await ctx.curl(url, {
          method: 'GET',
          headers: {
            cookie: cookies.join('; ')
          }
        });

        if (request.headers['set-cookie']) {
          // 收集新的 Cookies
          cookies = cookies.concat(request.headers['set-cookie'].map(cookie => cookie.split(';')[0]));
        }
        if (request.status >= 300 && request.status < 400) {
          const location = request.headers.location;
          if (location) {
            await tryRequest(location); // 跳转并等待完成
          }
        }
      } catch (err) {
        ctx.logger.error(err); // 输出错误信息

        success = false; // 标记为失败
        return; // 结束当前请求链
      }
    };

    await tryRequest(first_url); // 等待所有请求完成

    return success ? cookies : false; // 如果成功返回 Cookies，否则返回 false
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

  /**
   * 格式化用户信息
   * @param {object} raw 原始格式
   * @return {object} 用户信息
   */
  parseUserInfo(raw) {
    return {
      id: raw.id,
      student_id: raw.student_id,
      name: raw.name,
      college: raw.college,
      class: raw.class,
      major: raw.major,
      grade: raw.grade,
      grade_enter: raw.grade_enter,
      avatar: raw.avatar
    };
  }
}

module.exports = AuthService;
