// app/controller/auth/idaas/login.js

const { Controller } = require('egg');
const dayjs = require('dayjs');
const cryptojs = require('crypto-js');
const tripledes = require('crypto-js/tripledes');

// 定义创建接口的请求参数规则
const createRule = {
  username: 'string',
  password: 'string'
};

class AuthIdaasLoginController extends Controller {
  /**
   * 统一身份认证登录方法
   */
  async index() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.request.body);

    const username = ctx.request.body.username;
    const password = ctx.request.body.password;

    try {
      // 请求统一身份认证接口获取 access_token, refresh_token, locale
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
        // 统一身份认证登录成功
        const idaas_cookies = idaas.headers['set-cookie'].map(cookie => cookie.split(';')[0]);
        // 请求登录教务系统
        const login = await this.tryLogin(ctx.app.config.idaas.base + ctx.app.config.idaas.sso, idaas_cookies);
        if (login.some(item => item.startsWith('uid=')) && login.some(item => item.startsWith('route='))) {
          // 登录成功
          const cookie_uid = login.find(item => item.startsWith('uid='));
          const cookie_route = login.find(item => item.startsWith('route='));
          // 获取个人信息
          const info = await this.processInfo(username, password, cookie_uid, cookie_route);
          if (info.status === 1) {
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
        } else {
          // 登录过程中遇到错误，根据数据库内信息比对登录
          await this.databaseLogin(username, password);
        }
      } else if (idaas.status === 401) {
        // 统一身份认证密码错误
        ctx.body = {
          code: 401,
          message: '密码错误'
        };
      } else {
        // 统一身份认证其他错误
        ctx.body = {
          code: idaas.res.statusCode,
          message: idaas.res.statusMessage
        };
      }
    } catch (err) {
      // 认证过程中出现问题
      console.log(err);

      // 根据数据库内信息比对登录
      await this.databaseLogin(username, password);
    }
  }

  /**
   * 使用数据库信息登录
   * @param {string} username 用户名
   * @param {string} password 密码
   */
  async databaseLogin(username, password) {
    const { ctx } = this;
    const local = await ctx.app.mysql.select('user', {
      where: {
        student_id: username
      }
    });

    if (local.length > 0) {
      // 拥有该用户，进行比对
      if (
        password ===
        tripledes.decrypt(local[0].password, this.ctx.app.config.encryption.secret).toString(cryptojs.enc.Utf8)
      ) {
        // 密码正确
        const info = {
          student_id: local[0].student_id,
          name: local[0].name,
          college: local[0].college,
          class: local[0].class,
          major: local[0].major,
          grade: local[0].grade,
          grade_enter: local[0].grade_enter
        };
        ctx.body = {
          code: 202,
          message: '登录成功',
          data: {
            info,
            token: this.signToken(info)
          }
        };
      } else {
        // 密码错误
        ctx.body = {
          code: 401,
          message: '密码错误'
        };
      }
    } else {
      // 未注册
      ctx.body = {
        code: 500,
        message: '教务系统无法访问'
      };
    }
  }

  /**
   * 尝试登录并返回登录过程中所有 Cookie
   * @param {string} first_url 第一次请求 URL
   * @param {object} first_cookies 第一次请求 Cookies
   * @return {*} 返回 Cookies 或 false
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
          const location = result.headers.location;
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

  /**
   * 处理个人信息
   * @param {string} username 用户名
   * @param {string} password 密码
   * @param {string} cookie_uid Cookie UID
   * @param {string} cookie_route Cookie Route
   * @return {object} 返回 status, data
   */
  async processInfo(username, password, cookie_uid, cookie_route) {
    const { ctx } = this;
    const info_url = ctx.app.config.jwxt.base + ctx.app.config.jwxt.info;
    // 获取个人信息
    const info = await ctx.curl(info_url, {
      method: 'GET',
      headers: {
        cookie: `${cookie_uid}; ${cookie_route}`
      },
      dataType: 'json'
    });
    // 原始个人信息数据
    const raw = info.data.data.records;
    const origin_info = raw.find(element => element.xh === username);
    // 格式化个人信息数据
    const parse_info = {
      student_id: origin_info.xh,
      name: origin_info.xm,
      password: tripledes.encrypt(password, ctx.app.config.encryption.secret).toString(),
      college: origin_info.yxmc,
      class: origin_info.bjmc,
      major: origin_info.zymc,
      grade: origin_info.sznj,
      grade_enter: origin_info.rxnj,
      jw_id: origin_info.id,
      jw_uid: cookie_uid.replace('uid=', ''),
      jw_route: cookie_route.replace('route=', '')
    };
    // 检测是否存在该用户
    const check = await ctx.app.mysql.count('user', { student_id: username });
    parse_info.update_time = dayjs().unix();
    if (check > 0) {
      // 存在用户则更新
      const hit = await ctx.app.mysql.update('user', parse_info, {
        where: {
          student_id: username
        }
      });
      if (hit.affectedRows === 1) {
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
      }
      // 更新失败
      return {
        status: 2
      };
    }
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
    }
    // 插入失败
    return {
      status: 2
    };
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

module.exports = AuthIdaasLoginController;
