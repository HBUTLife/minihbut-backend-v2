// app/controller/info/weather.js

const { Controller } = require('egg');
const dayjs = require('dayjs');

class InfoWeatherController extends Controller {
  /**
   * 获取天气方法
   */
  async index() {
    const { ctx } = this;
    // 今日日期
    const today = dayjs().format('YYYY-MM-DD');
    // Redis 获取天气信息缓存
    const cache = await ctx.app.redis.get(`weather_${today}`);
    if (cache) {
      // 存在缓存，不更新
      ctx.body = {
        code: 201,
        message: '天气获取成功',
        data: JSON.parse(cache)
      };
    } else {
      // 不存在缓存，更新
      const get = await this.getWeather();
      const cache_update = await ctx.app.redis.set(`weather_${today}`, JSON.stringify(get), 'EX', 300); // 5 分钟过期
      if (cache_update === 'OK') {
        // 缓存更新成功
        ctx.body = {
          code: 200,
          message: '天气获取成功',
          data: get
        };
      } else {
        // 缓存更新失败
        ctx.body = {
          code: 500,
          message: '天气缓存更新失败'
        };
      }
    }
  }

  /**
   * 接口获取天气方法
   * @return {object} 天气信息
   */
  async getWeather() {
    const { ctx } = this;
    const api = `${ctx.app.config.qweather.api_url}?location=${ctx.app.config.qweather.location}&key=${ctx.app.config.qweather.key}`;
    const result = await ctx.curl(api, {
      dataType: 'json'
    });

    if (result.status === 200) {
      // 获取成功
      const data = result.data.daily[0];
      const list = {
        date: data.fxDate,
        sun_rise: data.sunrise,
        sun_set: data.sunset,
        moon_rise: data.moonrise,
        moon_set: data.moonset,
        temp_max: data.tempMax,
        temp_min: data.tempMin,
        icon_day: data.iconDay,
        text_day: data.textDay,
        icon_night: data.iconNight,
        text_night: data.textNight,
        last_update: dayjs().unix() // 最后更新时间
      };
      return list;
    }
  }
}

module.exports = InfoWeatherController;
