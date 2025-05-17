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

    {
      method: 'POST',
      path: '/custom-abono/:abonoId/cancel/:sellerId?',
      handler: 'custom-abono.cancel',
      config: {
        policies: [],
        middlewares: [],
      },
    },

    {
      method: 'POST',
      path: '/custom-abono/:abonoId/renew',
      handler: 'custom-abono.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};