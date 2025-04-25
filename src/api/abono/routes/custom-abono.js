'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/custom-abono/create',
      handler: 'custom-abono.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};