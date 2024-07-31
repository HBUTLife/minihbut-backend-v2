// app/controller/home.js

const { Controller } = require('egg');

class HomeController extends Controller {
  async index() {
    const { ctx } = this;
    ctx.body = { code: 200, message: 'MiniHBUT API is working' };
  }
}

module.exports = HomeController;
