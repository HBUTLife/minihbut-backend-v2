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
    // 检测是否存在已有数据
    const local = await ctx.app.mysql.select('weather', {
      where: {
        date: today
      }
    });

    if(local.length > 0) {
      // 已存在
      if(local[0].last_update + 3600 < dayjs().unix()) {
        // 已经过一小时，更新数据
        const data = await this.getWeather();
        const hit = await ctx.app.mysql.update('weather', data);

        if(hit.affectedRows === 1) {
          // 更新成功
          ctx.body = {
            code: 200,
            message: '天气获取成功',
            data: data
          };
        } else {
          // 更新失败
          ctx.body = {
            code: 500,
            message: '天气获取失败'
          };
        }
      } else {
        // 不更新数据
        ctx.body = {
          code: 201,
          message: '天气获取成功',
          data: local[0]
        };
      }
    } else {
      // 不存在，获取并插入
      const data = await this.getWeather();
      const hit = await ctx.app.mysql.insert('weather', data);

      if(hit.affectedRows === 1) {
        // 插入成功
        ctx.body = {
          code: 200,
          message: '天气获取成功',
          data: data
        };
      } else {
        // 插入失败
        ctx.body = {
          code: 500,
          message: '天气插入失败'
        };
      }
    }
  }

  /**
   * 接口获取天气方法
   * @returns 
   */
  async getWeather() {
    const { ctx } = this;
    const api = `${ctx.app.config.qweather.api_url}?location=${ctx.app.config.qweather.location}&key=${ctx.app.config.qweather.key}`;
    const result = await ctx.curl(api, {
      dataType: 'json'
    });
    
    if(result.status === 200) {
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
        last_update: dayjs().unix()
      };
      return list;
    }
  }
}

module.exports = InfoWeatherController;
