// app/controller/user/upload.js

const { Controller } = require('egg');
const dayjs = require('dayjs');
const crypto = require('crypto');

// 定义创建接口的请求参数规则
const createRule = {
  md5: 'string',
  ext: 'string'
};

class UserUploadController extends Controller {
  async index() {
    const { ctx } = this;

    // 参数校验
    ctx.validate(createRule, ctx.request.body);

    // 获取参数
    const fileMd5 = ctx.request.body.md5; // 文件 MD5 值
    const fileExt = ctx.request.body.ext; // 文件后缀

    // 上传文件路径
    const uploadKey = `minihbut/face/${fileMd5}.${fileExt}`;

    // 创建 Policy 并转换为 Base64
    const policy = btoa(
      JSON.stringify({
        expiration: dayjs().add(5, 'minutes').toISOString(),
        conditions: [
          ...ctx.app.config.oss.conditions,
          ['eq', '$key', uploadKey] // 限制上传文件路径
        ]
      })
    );

    // 创建签名
    const signature = crypto.createHmac('sha1', ctx.app.config.oss.accessKeySecret).update(policy).digest('base64');

    // 返回
    const data = {
      type: 'oss',
      host: ctx.app.config.oss.host,
      access_key_id: ctx.app.config.oss.accessKeyId,
      key: uploadKey,
      policy,
      signature
    };
    ctx.body = {
      code: 200,
      message: '上传信息获取成功',
      data
    };
  }
}

module.exports = UserUploadController;
