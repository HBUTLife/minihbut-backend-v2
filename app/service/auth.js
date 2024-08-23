// app/service/auth.js

const Service = require('egg').Service;
const dayjs = require('dayjs');
const cryptojs = require('crypto-js');
const tripledes = require('crypto-js/tripledes');

class AuthService extends Service {
  /**
   * Idaas 更新方法
   * @param {string} username 用户名
   * @return {boolean} 是否更新成功
   */
  async idaas(username) {
    const { ctx } = this;
    try {
      const user = await ctx.app.mysql.select('user', {
        where: {
          student_id: username
        }
      });
      // 获取并解密密码
      const password = tripledes.decrypt(user[0].password, this.ctx.app.config.passkey).toString(cryptojs.enc.Utf8);
      // 请求 Idaas 接口获取 access_token, refresh_token, locale
      const idaas = await ctx.curl(ctx.app.config.idaas.base + ctx.app.config.idaas.login, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        data: {
          username,
          password
        }
      });

      if (idaas.status === 200) {
        // Idaas 登录成功
        const idaas_cookies = idaas.headers['set-cookie'].map(cookie => cookie.split(';')[0]);
        // 请求登录教务系统
        const login = await this.tryLogin(ctx.app.config.idaas.base + ctx.app.config.idaas.sso, idaas_cookies);
        if (login.length > 0) {
          // 登录成功
          const cookie_uid = login.find(item => item.startsWith('uid='));
          const cookie_route = login.find(item => item.startsWith('route='));
          const hit = await ctx.app.mysql.update(
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
          if (hit.affectedRows === 1) {
            // 更新成功
            return true;
          }
          // 更新失败
          return false;
        } else {
          // 教务系统登录过程中遇到错误
          return false;
        }
      } else {
        // Idaas 密码错误或其他错误
        return false;
      }
    } catch (err) {
      // Idaas 认证请求失败
      return false;
    }
  }

  /**
   * 尝试登录并返回登录过程中所有 Cookie
   * @param {string} first_url
   * @param {object} first_cookies
   * @returns
   */
  async tryLogin(first_url, first_cookies) {
    const { ctx } = this;
    let cookies = [...first_cookies];
    let success = true; // 标记请求是否成功

    const tryRequest = async url => {
      try {
        const result = await ctx.curl(url, {
          method: 'GET',
          headers: {
            cookie: cookies.join('; ')
          }
        });

        if (result.headers['set-cookie']) {
          // 收集新的 Cookies
          cookies = cookies.concat(result.headers['set-cookie'].map(cookie => cookie.split(';')[0]));
        }
        if (result.status >= 300 && result.status < 400) {
          const location = result.headers['location'];
          if (location) {
            await tryRequest(location); // 跳转并等待完成
          }
        }
      } catch (err) {
        console.log(err); // 输出错误信息
        success = false; // 标记为失败
        return; // 结束当前请求链
      }
    };

    await tryRequest(first_url); // 等待所有请求完成

    return success ? cookies : false; // 如果成功返回 Cookies，否则返回 false
  }
}

module.exports = AuthService;
