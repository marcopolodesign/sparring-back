'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/abonos',
      handler: 'abono.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};