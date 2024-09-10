// app/controller/user/avatar.js

const { Controller } = require('egg');
const dayjs = require('dayjs');
const Minio = require('minio');
const crypto = require('crypto');

class UserAvatarController extends Controller {
  /**
   * 上传头像
   */
  async index() {
    const { ctx } = this;

    // 获取文件
    try {
      const fileStream = await ctx.getFileStream();

      // 检查文件类型是否为图片
      if (fileStream.mimeType.split('/')[0] !== 'image') {
        ctx.body = {
          code: 400,
          message: '非法文件类型'
        };
        return;
      }

      // 初始化个人信息
      const user = ctx.user_info;

      // 文件流转换为 Buffer
      let fileBuffer;
      await this.fileStreamToBuffer(fileStream).then(buffer => {
        fileBuffer = buffer;
      });

      // 获取文件 MD5
      const hash = crypto.createHash('md5');
      hash.update(fileBuffer);
      const md5 = hash.digest('hex');

      // 获取文件扩展名
      const fileExtension = fileStream.filename.split('.').pop().toLowerCase();

      // 文件路径
      const filePath = `image/${md5}.${fileExtension}`;

      // 上传
      const bucket = 'minihbut';
      const minioClient = new Minio.Client(ctx.app.config.minio);
      await minioClient.putObject(bucket, filePath, fileBuffer, {
        'content-type': fileStream.mimeType
      });

      // 更新头像链接
      const update_time = dayjs().unix();
      const url = `https://i0.stslb.com/sfs/${bucket}/${filePath}`;
      const update = await ctx.app.mysql.update(
        'user',
        { avatar: url, update_time },
        { where: { student_id: user.student_id } }
      );

      if (update.affectedRows === 1) {
        // 更新成功
        ctx.body = {
          code: 200,
          message: '头像上传成功',
          data: {
            avatar: url,
            student_id: user.student_id,
            update_time
          }
        };
      } else {
        // 更新失败
        ctx.body = {
          code: 500,
          message: '头像上传失败'
        };
      }
    } catch (err) {
      // 错误处理
      ctx.logger.error(err);

      ctx.body = {
        code: err.status,
        message: err.message
      };
    }
  }

  /**
   * FileStream 转 Buffer
   * @param {*} fileStream 文件流
   * @return {buffer} buffer
   */
  async fileStreamToBuffer(fileStream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      fileStream.on('data', chunk => {
        chunks.push(chunk);
      });
      fileStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      fileStream.on('error', err => {
        reject(err);
      });
    });
  }
}

module.exports = UserAvatarController;
