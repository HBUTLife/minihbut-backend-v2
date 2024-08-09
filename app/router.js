/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  router.get('/', controller.home.index);
  router.post('/auth/idaas/login', controller.auth.idaas.login.index); // Idaas 登录
  router.post('/auth/idaas/sms', controller.auth.idaas.sms.index); // Idaas 发送短信
  router.post('/auth/idaas/code', controller.auth.idaas.code.index); // Idaas 短信验证
  router.post('/auth/idaas/reset', controller.auth.idaas.reset.index); // Idaas 修改密码
  router.post('/auth/wechat/login', controller.auth.wechat.login.index);
  router.post('/auth/wechat/bind', controller.auth.wechat.bind.index);
  router.post('/auth/wechat/unbind', controller.auth.wechat.unbind.index);
  router.get('/score/list', controller.score.list.index);
  router.get('/rank/list', controller.rank.list.index);
  router.get('/exam/list', controller.exam.list.index);
  router.get('/statistic/search', controller.statistic.search.index);
  router.get('/statistic/detail', controller.statistic.detail.index);
  router.get('/classroom/search', controller.classroom.search.index);
  router.get('/info/term', controller.info.term.index);
  router.get('/info/today', controller.info.today.index);
  router.get('/timetable/person/list', controller.timetable.person.list.index);
  router.get('/timetable/person/today', controller.timetable.person.today.index);
  router.get('/timetable/person/update', controller.timetable.person.update.index);
  router.post('/timetable/person/add', controller.timetable.person.add.index);
  router.post('/timetable/person/delete', controller.timetable.person.delete.index);
  router.post('/timetable/person/edit', controller.timetable.person.edit.index);
  router.get('/timetable/person/export', controller.timetable.person.export.index);
  router.get('/timetable/person/ics', controller.timetable.person.ics.index);
  router.get('/timetable/class/search', controller.timetable.class.search.index);
  router.get('/timetable/class/detail', controller.timetable.class.detail.index);
};
