// app/controller/auth/login.js

const { Controller } = require('egg');
const dayjs = require('dayjs');
const cryptojs = require('crypto-js');
const tripledes = require('crypto-js/tripledes');

// 定义创建接口的请求参数规则
const createRule = {
  username: 'string',
  password: 'string'
};

class AuthLoginController extends Controller {
  /**
   * 登录方法
   */
  async index() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.request.body);

    const username = ctx.request.body.username;
    const password = ctx.request.body.password;

    try {
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
        // 登录成功，存入/更新信息
        const info = await this.processInfo(username, password, cookie_uid, cookie_route);
        if(info.status === 1) {
          // 存入/更新信息成功
          ctx.body = {
            code: 200,
            message: '登录成功',
            data: {
              info: info.data,
              token: this.signToken(info.data)
            }
          };
        } else if (info.status === 2) {
          // 存入/更新信息失败
          ctx.body = {
            code: 500,
            message: '数据库处理失败'
          };
        }
      } else if (login.status === 200) {
        // 登陆失败，密码错误
        ctx.body = {
          code: 402,
          message: '密码错误'
        };
      }
    } catch(err) {
      // 教务系统无法访问，根据数据库内信息比对登录
      const local = await ctx.app.mysql.select('user', {
        where: {
          student_id: username
        }
      });

      if(local.length > 0) {
        // 拥有该用户，进行比对
        if(password === tripledes.decrypt(local[0].password, this.ctx.app.config.passkey).toString(cryptojs.enc.Utf8)) {
          // 密码正确
          let info = {
            student_id: local[0].student_id,
            name: local[0].name,
            college: local[0].college,
            class: local[0].class,
            major: local[0].major,
            grade: local[0].grade
          };
          ctx.body = {
            code: 200,
            message: '登录成功',
            data: {
              info: info,
              token: this.signToken(info)
            }
          };
        } else {
          // 密码错误
          ctx.body = {
            code: 402,
            message: '密码错误'
          };
        }
      } else {
        // 未注册
        ctx.body = {
          code: -1,
          message: '教务系统无法访问'
        };
      }
    }
  }

  /**
   * 处理个人信息
   * @param {string} username 
   * @param {string} password 
   * @param {string} cookie_uid 
   * @param {string} cookie_route 
   * @returns 
   */
  async processInfo(username, password, cookie_uid, cookie_route) {
    const { ctx } = this;
    const info_url = ctx.app.config.jwxt.base + ctx.app.config.jwxt.info;
    // 获取个人信息
    const info = await ctx.curl(info_url, {
      method: 'GET',
      headers: {
        'cookie': `${cookie_uid}; ${cookie_route}`
      },
      dataType: 'json'
    });
    // 原始个人信息数据
    const origin_info = info.data.data.records[0];
    // 格式化个人信息数据
    let parse_info = {
      student_id: origin_info.xh,
      name: origin_info.xm,
      password: tripledes.encrypt(password, ctx.app.config.passkey).toString(),
      college: origin_info.yxmc,
      class: origin_info.bjmc,
      major: origin_info.zymc,
      grade: origin_info.sznj,
      jw_id: origin_info.id,
      jw_uid: cookie_uid.replace('uid=', ''),
      jw_route: cookie_route.replace('route=', '')
    };
    // 检测是否存在该用户
    const check = await ctx.app.mysql.count('user', { student_id: username });
    parse_info.update_time = dayjs().unix();
    if(check > 0) {
      // 存在用户则更新
      const hit = await ctx.app.mysql.update('user', parse_info, {
        where: {
          student_id: username
        }
      });
      if(hit.affectedRows === 1) {
        // 更新成功
        delete parse_info.password;
        delete parse_info.jw_id;
        delete parse_info.jw_uid;
        delete parse_info.jw_route;
        delete parse_info.create_time;
        delete parse_info.update_time;
        return {
          status: 1,
          data: parse_info
        };
      } else {
        // 更新失败
        return {
          status: 2
        };
      }
    } else {
      // 不存在用户则插入
      parse_info.create_time = dayjs().unix();
      const hit = await ctx.app.mysql.insert('user', parse_info);
      if (hit.affectedRows === 1) {
        // 插入成功
        delete parse_info.password;
        delete parse_info.jw_id;
        delete parse_info.jw_uid;
        delete parse_info.jw_route;
        delete parse_info.create_time;
        delete parse_info.update_time;
        return {
          status: 1,
          data: parse_info
        };
      } else {
        // 插入失败
        return {
          status: 2
        };
      }
    }
  }

  /**
   * 签名token
   * @param {object} payload 
   * @returns 
   */
  signToken(payload) {
    const { ctx } = this;
    return ctx.app.jwt.sign(payload, ctx.app.config.jwt.secret, ctx.app.config.jwt.expiresIn);
  }
}

module.exports = AuthLoginController;
