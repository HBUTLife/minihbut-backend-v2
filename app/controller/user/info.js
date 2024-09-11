// app/controller/user/info.js

const { Controller } = require('egg');

class UserInfoController extends Controller {
  /**
   * 用户信息
   */
  async index() {
    const { ctx } = this;

    // 初始化个人信息
    const user = ctx.user_info;

    // Redis Key
    const cache_key = `user_info_${user.student_id}`;

    // 从缓存中获取
    const cache = await ctx.app.redis.get(cache_key);

    if (cache) {
      // 缓存存在
      ctx.body = {
        code: 201,
        message: '用户信息获取成功',
        data: JSON.parse(cache)
      };
    } else {
      // 不存在缓存
      try {
        // 更新用户信息
        this.updateUserInfo(user.student_id, ctx);

        // 获取用户信息
        const query = await ctx.app.mysql.select('user', { where: { student_id: user.student_id } });

        // 如果没有用户信息
        if (query.length === 0) {
          ctx.body = {
            code: 404,
            message: '用户不存在'
          };
          return;
        }

        // 有用户信息
        const info = ctx.service.auth.parseUserInfo(query[0]);

        // 写入缓存
        const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(info), 'EX', 86400); // 缓存 24 小时

        if (cache_update) {
          // 写入成功
          ctx.body = {
            code: 200,
            message: '用户信息获取成功',
            data: info
          };
        } else {
          // 写入失败
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

  /**
   * 更新用户信息
   * @param {string} student_id 学号
   * @param {*} ctx ctx
   * @return {boolean} 是否更新成功
   */
  async updateUserInfo(student_id, ctx) {
    // 获取用户登录凭证
    try {
      const query = await ctx.app.mysql.select('user', { where: { student_id } });

      if (query.length > 0) {
        // 用户存在
        try {
          // 请求教务系统用户信息接口
          const request = await ctx.curl(ctx.app.config.jwxt.base + ctx.app.config.jwxt.url.info, {
            method: 'GET',
            headers: {
              cookie: `uid=${query[0].jw_uid}; route=${query[0].jw_route}`
            },
            dataType: 'json'
          });

          if (request.status === 200) {
            // 获取成功
            const raw = request.data.data.records;
            const origin_info = raw.find(element => element.xh === student_id);

            // 格式化个人信息数据
            const parse_info = {
              student_id: origin_info.xh,
              name: origin_info.xm,
              college: origin_info.yxmc,
              class: origin_info.bjmc,
              major: origin_info.zymc,
              grade: origin_info.sznj,
              grade_enter: origin_info.rxnj
            };

            try {
              // 更新数据库内信息
              const update = await ctx.app.mysql.update('user', parse_info, { where: { student_id } });

              if (update.affectedRows === 1) {
                // 更新成功
                return true;
              }

              // 更新失败
              return false;
            } catch (err) {
              // 数据库更新失败
              ctx.logger.error(err);
              return false;
            }
          } else if (request.status >= 300 && request.status < 400) {
            // 登录凭证过期
            const reauth = await ctx.service.auth.idaas(student_id);

            if (reauth.code === 200) {
              // 重新授权成功
              this.updateUserInfo(student_id, ctx);
            } else {
              // 重新授权失败
              return false;
            }
          } else {
            // 获取失败
            return false;
          }
        } catch (err) {
          // 教务系统接口请求失败
          ctx.logger.error(err);
          return false;
        }
      } else {
        // 用户不存在
        return false;
      }
    } catch (err) {
      // 数据库查询失败
      ctx.logger.error(err);
      return false;
    }
  }
}

module.exports = UserInfoController;
