// app/service/auth.js

const Service = require('egg').Service;
const cryptojs = require('crypto-js');
const tripledes = require('crypto-js/tripledes');

class AuthService extends Service {
  async index(username) {
    const { ctx } = this;
    const user = ctx.app.mysql.select('user', {
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
    const cookie_route =  cookies[1].split(';')[0];
    // 请求登录
    const login = await ctx.curl(login_url, {
      method: 'POST',
      headers: {
        'cookie': `${cookie_uid}; ${cookie_route}`
      },
      data: {
        username: username,
        password: password
      }
    });

    if(login.status === 302) {
      // 登录成功，更新 uid, route
      const hit = ctx.app.mysql.update('user', {
        jw_uid: cookie_uid.replace('uid=', ''),
        jw_route: cookie_route.replace('route=', '')
      }, {
        where: {
          student_id: username
        }
      });

      if(hit.affectedRows === 1) {
        // 更新成功
        return true;
      } else {
        // 更新失败
        return false;
      }
    } else {
      // 登录失败
      return false;
    }
  }
}

module.exports = AuthService;
