// app/controller/auth.js

const { Controller } = require('egg');

// 定义创建接口的请求参数规则
const createRule = {
  username: 'string',
  password: 'string'
};

class AuthController extends Controller {
  async login() {
    const { ctx } = this;
    // 参数校验
    ctx.validate(createRule, ctx.request.body);

    
  }
}

module.exports = AuthController;
