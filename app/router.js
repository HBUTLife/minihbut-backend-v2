/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;

  router.post('/auth/idaas/login', controller.auth.idaas.login.index);
  router.post('/auth/idaas/forget/sms', controller.auth.idaas.forget.sms.index);
  router.post('/auth/idaas/forget/code', controller.auth.idaas.forget.code.index);
  router.post('/auth/idaas/forget/reset', controller.auth.idaas.forget.reset.index);

  router.post('/auth/wechat/login', controller.auth.wechat.login.index);
  router.post('/auth/wechat/bind', controller.auth.wechat.bind.index);
  router.post('/auth/wechat/unbind', controller.auth.wechat.unbind.index);
  router.get('/auth/wechat/status', controller.auth.wechat.status.index);

  router.get('/user/info', controller.user.info.index);
  router.post('/user/upload', controller.user.upload.index);

  router.get('/timetable/person/list', controller.timetable.person.list.index);
  router.get('/timetable/person/today', controller.timetable.person.today.index);
  router.get('/timetable/person/update', controller.timetable.person.update.index);
  router.get('/timetable/person/export', controller.timetable.person.export.index);
  router.get('/timetable/person/ics', controller.timetable.person.ics.index);
  router.post('/timetable/person/add', controller.timetable.person.add.index);
  router.post('/timetable/person/delete', controller.timetable.person.delete.index);
  router.post('/timetable/person/edit', controller.timetable.person.edit.index);

  router.get('/timetable/class/list', controller.timetable.class.list.index);
  router.get('/timetable/class/detail', controller.timetable.class.detail.index);

  router.get('/statistic/search', controller.statistic.search.index);
  router.get('/statistic/detail', controller.statistic.detail.index);

  router.get('/score/list', controller.score.list.index);
  router.get('/rank/list', controller.rank.list.index);
  router.get('/exam/list', controller.exam.list.index);
  router.get('/classroom/search', controller.classroom.search.index);

  router.get('/info/term', controller.info.term.index);
  router.get('/info/today', controller.info.today.index);

  router.get('/info/swiper', controller.info.swiper.get.index);
  router.get('/info/swiper/click', controller.info.swiper.click.index);

  router.get('/info/urgent', controller.info.urgent.index);
  router.get('/info/weather', controller.info.weather.index);
  router.get('/info/miniprogram', controller.info.miniprogram.index);
};
