// config/config.*.js
// prod 生产环境: npm run start
// local 本地环境: npm run dev

// MySQL 配置
exports.mysql = {
  client: {
    host: '127.0.0.1', // MySQL 主机
    port: '3306', // MySQL 端口
    user: '', // MySQL 用户名
    password: '', // MySQL 用户密码
    database: '' // MySQL 数据库名称
  }
};

// Redis 配置
exports.redis = {
  client: {
    host: '127.0.0.1', // Redis 主机
    port: 6379, // Redis 端口
    password: '', // Redis 密码
    db: 0 // 默认
  }
};

// MinIO 配置
exports.minio = {
  endPoint: '',
  port: 443,
  useSSL: true,
  accessKey: '',
  secretKey: ''
};

// 日志配置
exports.logger = {
  level: 'ERROR'
};
