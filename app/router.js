/**
 * @param {Egg.Application} app - egg application
 */
module.exports = (app) => {
  const { router, controller } = app;
  router.get('/', controller.home.index);
  router.post('/auth/login', controller.auth.login.index);
  router.post('/auth/wechat/login', controller.auth.wechat.login.index);
  router.post('/auth/wechat/bind', controller.auth.wechat.bind.index);
  router.post('/auth/wechat/unbind', controller.auth.wechat.unbind.index);
  router.get('/score/list', controller.score.list.index);
  router.get('/rank/list', controller.rank.list.index);
  router.get('/exam/list', controller.exam.list.index);
  router.get('/statistic/search', controller.statistic.search.index);
  router.get('/statistic/detail', controller.statistic.detail.index);
  router.get('/classroom/search', controller.classroom.search.index);
  router.get('/info/weather', controller.info.weather.index);
  router.get('/info/other', controller.info.other.index);
  router.get('/info/term', controller.info.term.index);
  router.get('/info/article', controller.info.article.index);
};
