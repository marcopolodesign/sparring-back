'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/custom-movements',
      handler: 'custom-movements.findCustomMovements',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
