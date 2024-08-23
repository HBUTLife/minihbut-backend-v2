// app/controller/info/extra.js

const { Controller } = require('egg');
const dayjs = require('dayjs');

// 定义创建接口的请求参数规则
const createRule = {
  url: 'string'
};

class InfoExtraController extends Controller {
  /**
   * 获取其他信息
   */
  async index() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.query);
    // 获取参数
    const url = ctx.query.url;
    // 获取内容
    const result = await ctx.curl(`${ctx.app.config.info_extra}${url}?t=${dayjs().unix()}`);
    if (result.status === 200) {
      ctx.body = {
        code: 200,
        message: '获取成功',
        data: JSON.parse(result.data)
      };
    } else {
      ctx.body = {
        code: result.res.statusCode,
        message: result.res.statusMessage
      };
    }
  }
}

module.exports = InfoExtraController;
