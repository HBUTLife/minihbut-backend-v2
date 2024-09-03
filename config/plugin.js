/** @type Egg.EggPlugin */
module.exports = {
  validate: {
    enable: true,
    package: 'egg-validate'
  },

  mysql: {
    enable: true,
    package: 'egg-mysql'
  },

  jwt: {
    enable: true,
    package: 'egg-jwt'
  },

  redis: {
    enable: true,
    package: 'egg-redis'
  }
};
