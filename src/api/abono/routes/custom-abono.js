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


        // Route for creating a "clase"
        {
          method: 'POST',
          path: '/custom-abono/clase/create',
          handler: 'custom-abono.createClase',
          config: {
            policies: [],
            middlewares: [],
          },
        },
    
        // Route for updating a "clase"
        {
          method: 'POST',
          path: '/custom-abono/clase/:abonoId/renew',
          handler: 'custom-abono.updateClase',
          config: {
            policies: [],
            middlewares: [],
          },
        },
  ],
};