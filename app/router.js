/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  router.get('/', controller.home.index);
  router.post('/auth/login', controller.auth.login.index);
  router.get('/score/list', controller.score.list.index);
};
