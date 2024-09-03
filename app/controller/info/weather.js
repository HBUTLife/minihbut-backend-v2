// app/controller/info/weather.js

const { Controller } = require('egg');
const dayjs = require('dayjs');

class InfoWeatherController extends Controller {
  /**
   * 获取天气
   */
  async index() {
    const { ctx } = this;
    let adcode = '420111'; // 默认洪山区
    // 若有 adcode 则查询指定地区
    // if (ctx.query.adcode) {
    //   adcode = ctx.query.adcode;
    // }
    // Redis Key
    const cache_key = `info_weather_${adcode}`;
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
      const lbs = await ctx.curl(ctx.app.config.lbs.base + ctx.app.config.lbs.weather, {
        data: {
          key: ctx.app.config.lbs.key,
          adcode
        },
        dataType: 'json'
      });
      console.log(ctx.app.config.lbs.key);
      if (lbs.data.status === 0) {
        // 获取成功
        const result = lbs.data.result.realtime[0];
        const data = {
          location: {
            province: result.province, // 省份
            city: result.city, // 市
            district: result.district, // 区县
            adcode: result.adcode // 区划编码
          },
          info: {
            text: result.infos.weather,
            temperature: result.infos.temperature,
            icon: this.getWeatherIcon(result.infos.weather)
          },
          time: {
            update_time: dayjs().format('YYYY-MM-DD HH:mm'), // 缓存更新时间
            lbs_update_time: result.update_time // 接口所返回的更新时间
          }
        };
        const cache_update = await ctx.app.redis.set(cache_key, JSON.stringify(data), 'EX', 120); // 2 分钟过期
        if (cache_update === 'OK') {
          // 更新成功
          ctx.body = {
            code: 200,
            message: '实时天气获取成功',
            data
          };
        } else {
          // 更新失败
          ctx.body = {
            code: 500,
            message: '实时天气缓存更新失败'
          };
        }
      } else {
        // 获取失败
        ctx.body = {
          code: 500,
          message: '实时天气获取失败'
        };
      }
    }
  }

  /**
   * 获取图标编号
   * @param {string} weather
   * @returns
   */
  getWeatherIcon(weather) {
    // 根据和风天气开源图标指定编号
    const weather_map = {
      晴天: 100,
      多云: 101,
      阴: 104,
      阵雨: 300,
      雷阵雨: 302,
      雷阵雨伴有冰雹: 304,
      雨夹雪: 404,
      小雨: 305,
      中雨: 306,
      大雨: 307,
      暴雨: 310,
      大暴雨: 311,
      特大暴雨阵雪: 312,
      阵雪: 406,
      小雪: 400,
      中雪: 401,
      大雪: 402,
      暴雪: 403,
      雾: 501,
      冻雨: 313,
      沙尘暴: 507,
      浮尘: 504,
      扬沙: 503,
      强沙尘暴: 508,
      浓雾: 509,
      强浓雾: 510,
      霾: 502,
      中度霾: 511,
      重度霾: 512,
      严重霾: 513,
      大雾: 514,
      特强浓雾: 515,
      雨: 399,
      雪: 499
    };
    return weather_map[weather] || null;
  }
}

module.exports = InfoWeatherController;
