// app/controller/info/weather.js

const { Controller } = require('egg');
const dayjs = require('dayjs');

class InfoWeatherController extends Controller {
  /**
   * 获取天气
   */
  async index() {
    const { ctx } = this;

    // 天气位置
    const location = ctx.query.location ? ctx.query.location : ctx.app.config.qweather.location;

    // Redis Key
    const cache_key = `info_weather_${location}`;

    // Redis 获取实时天气
    const cache = await ctx.app.redis.get(cache_key);

    if (cache) {
      // 存在缓存
      ctx.body = {
        code: 201,
        message: '实时天气获取成功',
        data: JSON.parse(cache)
      };
    } else {
      // 不存在缓存
      const request = await ctx.curl(ctx.app.config.qweather.base + ctx.app.config.qweather.url.now, {
        method: 'GET',
        data: {
          key: ctx.app.config.qweather.key,
          location
        },
        dataType: 'json'
      });

      if (request.data.code === '200') {
        // 获取成功
        const data = {
          info: {
            text: request.data.now.text, // 文字
            temperature: request.data.now.temp, // 温度
            icon: `${ctx.app.config.qweather.iconUrl}/${request.data.now.icon}.png?x-oss-process=image/resize,w_28,h_28` // 图标
          },
          time: {
            observe_time: dayjs(request.data.now.obsTime).format('YYYY-MM-DD HH:mm'), // 数据观测时间
            update_time: dayjs(request.data.updateTime).format('YYYY-MM-DD HH:mm'), // 和风天气 API 更新时间
            cache_time: dayjs().format('YYYY-MM-DD HH:mm') // API 缓存时间
          },
          refer: request.data.refer
        };

        const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(data), 'EX', 300); // 缓存 5 分钟

        if (cache_update === 'OK') {
          // 缓存成功
          ctx.body = {
            code: 200,
            message: '实时天气获取成功',
            data
          };
        } else {
          // 缓存失败
          ctx.body = {
            code: 500,
            message: '服务器内部错误'
          };
        }
      } else {
        // 获取失败
        ctx.body = {
          code: 400,
          message: '实时天气获取失败'
        };
      }
    }
  }
}

module.exports = InfoWeatherController;
