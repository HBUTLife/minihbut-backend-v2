// app/controller/auth/idaas.js

const { Controller } = require('egg');
const dayjs = require('dayjs');
const cryptojs = require('crypto-js');
const tripledes = require('crypto-js/tripledes');

// 定义创建接口的请求参数规则
const createRule = {
  username: 'string',
  password: 'string'
};

class AuthIdaasController extends Controller {
  /**
   * Idaas 登录方法
   */
  async index() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.request.body);

    const username = ctx.request.body.username;
    const password = ctx.request.body.password;

    try {
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
        // 登录成功
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
                  // 完全成功
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
                  // 二次 CasLogin 验证失败
                  ctx.body = {
                    code: 500,
                    message: '二次 CasLogin 验证失败'
                  };
                }
              } else {
                // CasLogin 验证失败
                ctx.body = {
                  code: 500,
                  message: 'CasLogin 验证失败'
                };
              }
            } else {
              // 教务 ticket 验证失败
              ctx.body = {
                code: 500,
                message: '教务系统 ticket 验证失败'
              };
            }
          } else {
            // 二次 SSO 请求失败
            ctx.body = {
              code: 500,
              message: '二次 SSO 请求失败'
            };
          }
        } else {
          // SSO 请求失败
          ctx.body = {
            code: 500,
            message: 'SSO 请求失败'
          };
        }
      } else if (login.status === 401) {
        // 登陆失败，密码错误
        ctx.body = {
          code: 401,
          message: '密码错误'
        };
      }
    } catch (err) {
      // Idaas或教务系统出错，根据数据库内信息比对登录
      const local = await ctx.app.mysql.select('user', {
        where: {
          student_id: username
        }
      });

      if (local.length > 0) {
        // 拥有该用户，进行比对
        if (
          password === tripledes.decrypt(local[0].password, this.ctx.app.config.passkey).toString(cryptojs.enc.Utf8)
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
            code: 200,
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
    const origin_info = info.data.data.records[0];
    // 格式化个人信息数据
    const parse_info = {
      student_id: origin_info.xh,
      name: origin_info.xm,
      password: tripledes.encrypt(password, ctx.app.config.passkey).toString(),
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

module.exports = AuthIdaasController;
