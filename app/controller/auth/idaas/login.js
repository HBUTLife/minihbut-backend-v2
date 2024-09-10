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

    // 获取参数
    const username = ctx.request.body.username;
    const password = ctx.request.body.password;

    try {
      // 请求统一身份认证接口获取 access_token, refresh_token, locale
      const request = await ctx.curl(ctx.app.config.idaas.base + ctx.app.config.idaas.login, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        data: {
          username,
          password
        }
      });

      if (request.status === 200) {
        // 统一身份认证登录成功
        const idaas_cookies = request.headers['set-cookie'].map(cookie => cookie.split(';')[0]);

        // 请求登录教务系统
        const login = await ctx.service.auth.tryLogin(
          ctx.app.config.idaas.base + ctx.app.config.idaas.sso,
          idaas_cookies,
          ctx
        );

        if (login.some(item => item.startsWith('uid=')) && login.some(item => item.startsWith('route='))) {
          // 登录成功
          const cookie_uid = login.find(item => item.startsWith('uid='));
          const cookie_route = login.find(item => item.startsWith('route='));

          // 更新个人信息
          const process_info = await this.processInfo(username, password, cookie_uid, cookie_route, ctx);

          try {
            // 获取个人信息
            const result = await ctx.app.mysql.select('user', { where: { student_id: username } });
            const info = ctx.service.auth.parseUserInfo(result[0]);

            if (process_info.status === 1 && result.length > 0) {
              // 存入/更新信息成功
              ctx.body = {
                code: 200,
                message: '登录成功',
                data: {
                  info,
                  token: ctx.service.auth.signToken(info)
                }
              };
            } else if (process_info.status === 2) {
              // 存入/更新信息失败
              ctx.body = {
                code: 500,
                message: '数据库处理失败'
              };
            }
          } catch (err) {
            // 数据库查询失败
            ctx.logger.error(err);

            ctx.body = {
              code: 500,
              message: '服务器内部错误'
            };
          }
        } else {
          // 登录过程中遇到错误，根据数据库内信息比对登录
          await this.databaseLogin(username, password, ctx);
        }
      } else if (request.status === 401) {
        // 统一身份认证密码错误
        ctx.body = {
          code: 401,
          message: '密码错误'
        };
      } else {
        // 统一身份认证其他错误
        ctx.body = {
          code: 400,
          message: request.res.statusMessage
        };
      }
    } catch (err) {
      // 认证过程中出现问题
      ctx.logger.error(err);

      // 根据数据库内信息比对登录
      await this.databaseLogin(username, password, ctx);
    }
  }

  /**
   * 使用数据库信息登录
   * @param {string} username 用户名
   * @param {string} password 密码
   * @param {*} ctx ctx
   */
  async databaseLogin(username, password, ctx) {
    try {
      const query = await ctx.app.mysql.select('user', {
        where: {
          student_id: username
        }
      });

      if (query.length > 0) {
        // 拥有该用户，进行比对
        if (
          password ===
          tripledes.decrypt(query[0].password, this.ctx.app.config.encryption.secret).toString(cryptojs.enc.Utf8)
        ) {
          // 密码正确
          const info = ctx.service.parseUserInfo(query[0]);

          ctx.body = {
            code: 202,
            message: '登录成功',
            data: {
              info,
              token: ctx.service.auth.signToken(info)
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
          code: 503,
          message: '用户未注册，但目前教务系统无法访问'
        };
      }
    } catch (err) {
      // 数据库查询失败
      ctx.logger.error(err);

      ctx.body = {
        code: 500,
        message: '服务器内部错误'
      };

      return false;
    }
  }

  /**
   * 处理个人信息
   * @param {string} username 用户名
   * @param {string} password 密码
   * @param {string} cookie_uid Cookie UID
   * @param {string} cookie_route Cookie Route\
   * @param {*} ctx ctx
   * @return {object} 返回 status, data
   */
  async processInfo(username, password, cookie_uid, cookie_route, ctx) {
    const info_url = ctx.app.config.jwxt.base + ctx.app.config.jwxt.info;

    // 获取个人信息
    const request = await ctx.curl(info_url, {
      method: 'GET',
      headers: {
        cookie: `${cookie_uid}; ${cookie_route}`
      },
      dataType: 'json'
    });

    // 原始个人信息数据
    const raw = request.data.data.records;
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

    try {
      // 检测是否存在该用户
      const query = await ctx.app.mysql.count('user', { student_id: username });
      parse_info.update_time = dayjs().unix();

      if (query > 0) {
        try {
          // 存在用户则更新
          const update = await ctx.app.mysql.update('user', parse_info, {
            where: {
              student_id: username
            }
          });

          if (update.affectedRows === 1) {
            // 更新成功
            return { status: 1 };
          }

          // 更新失败
          return { status: 2 };
        } catch (err) {
          // 数据库更新失败
          ctx.logger.error(err);

          ctx.body = {
            code: 500,
            message: '服务器内部错误'
          };
        }
      }

      // 不存在用户则插入
      parse_info.create_time = dayjs().unix();
      try {
        const insert = await ctx.app.mysql.insert('user', parse_info);

        if (insert.affectedRows === 1) {
          // 插入成功
          return { status: 1 };
        }

        // 插入失败
        return { status: 2 };
      } catch (err) {
        // 数据库插入失败
        ctx.logger.error(err);

        ctx.body = {
          code: 500,
          message: '服务器内部错误'
        };
      }
    } catch (err) {
      // 数据库查询失败
      ctx.logger.error(err);

      ctx.body = {
        code: 500,
        message: '服务器内部错误'
      };
    }
  }
}

module.exports = AuthIdaasLoginController;
