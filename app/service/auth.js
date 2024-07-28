// app/service/auth.js

const Service = require('egg').Service;
const dayjs = require('dayjs');
const cryptojs = require('crypto-js');
const tripledes = require('crypto-js/tripledes');

class AuthService extends Service {
  /**
   * 教务系统更新方法
   * @param {string} username 用户名
   * @return {boolean} 是否更新成功
   */
  async login(username) {
    const { ctx } = this;
    const user = await ctx.app.mysql.select('user', {
      where: {
        student_id: username
      }
    });
    // 获取并解密密码
    const password = tripledes.decrypt(user[0].password, this.ctx.app.config.passkey).toString(cryptojs.enc.Utf8);

    // 登录地址
    const login_url = ctx.app.config.jwxt.base + ctx.app.config.jwxt.login;
    // 首次访问获取 cookies
    const enter = await ctx.curl(login_url);
    const cookies = enter.headers['set-cookie'];
    const cookie_uid = cookies[0].split(';')[0];
    const cookie_route = cookies[1].split(';')[0];
    // 请求登录
    const login = await ctx.curl(login_url, {
      method: 'POST',
      headers: {
        cookie: `${cookie_uid}; ${cookie_route}`
      },
      data: {
        username,
        password
      }
    });

    if (login.status === 302) {
      // 登录成功，更新 uid, route
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
    }
    // 登录失败
    return false;
  }

  /**
   * Idaas 更新方法
   * @param {string} username 用户名
   * @return {boolean} 是否更新成功
   */
  async idaas(username) {
    const { ctx } = this;
    const user = await ctx.app.mysql.select('user', {
      where: {
        student_id: username
      }
    });
    // 获取并解密密码
    const password = tripledes.decrypt(user[0].password, this.ctx.app.config.passkey).toString(cryptojs.enc.Utf8);
    // 请求 Idaas 接口获取 access_token, refresh_token, locale
    const login = await ctx.curl(ctx.app.config.idaas.base + ctx.app.config.idaas.login, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      data: {
        username,
        password
      }
    });

    if (login.status === 200) {
      // Idaas 验证成功
      const idaas_cookies = login.headers['set-cookie'].map(cookie => cookie.split(';')[0]).join('; ');
      // 请求 SSO
      const sso = await ctx.curl(ctx.app.config.idaas.base + ctx.app.config.idaas.sso, {
        headers: {
          cookie: idaas_cookies
        }
      });

      if (sso.status === 303) {
        // SSO 授权成功
        const sso_cookies = sso.headers['set-cookie'].map(cookie => cookie.split(';')[0]).join('; ');
        const sso_next_url = sso.headers.location;
        // 请求二次 SSO
        const sso2 = await ctx.curl(sso_next_url, {
          headers: {
            cookie: `${idaas_cookies}; ${sso_cookies}`
          }
        });

        if (sso2.status === 302) {
          // SSO2 授权成功，跳转教务
          const sso2_next_url = sso2.headers.location;
          // 请求教务系统前先获得 uid 和 route
          const enter = await ctx.curl(ctx.app.config.jwxt.base + ctx.app.config.jwxt.login);
          const enter_cookies = enter.headers['set-cookie'];
          const cookie_uid = enter_cookies[0].split(';')[0];
          const cookie_route = enter_cookies[1].split(';')[0];
          // 请求教务 ticket 验证
          const ticket = await ctx.curl(sso2_next_url, {
            headers: {
              cookie: `${cookie_uid}; ${cookie_route}`
            }
          });

          if (ticket.status === 302) {
            // ticket 验证成功
            const ticket_cookies = ticket.headers['set-cookie'];
            const cookie_jsessionid = ticket_cookies[0].split(';');
            const ticket_next_url = ticket.headers.location;
            const jw_cookies_all = `${cookie_uid}; ${cookie_route}; ${cookie_jsessionid}`;
            // 跳转 caslogin
            const cas = await ctx.curl(ticket_next_url, {
              headers: {
                cookie: jw_cookies_all
              }
            });

            if (cas.status === 301) {
              // 跳转成功
              const cas_next_url = cas.headers.location;
              // 二次跳转 caslogin
              const cas2 = await ctx.curl(cas_next_url, {
                headers: {
                  cookie: jw_cookies_all
                }
              });

              if (cas2.status === 302) {
                // 完全成功，更新 uid, route
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
              }
              // 二次 CasLogin 验证失败
              return false;
            }
            // CasLogin 验证失败
            return false;
          }
          // 教务 ticket 验证失败
          return false;
        }
        // 二次 SSO 请求失败
        return false;
      }
      // SSO 请求失败
      return false;
    }
    // Idaas 验证失败
    return false;
  }
}

module.exports = AuthService;
