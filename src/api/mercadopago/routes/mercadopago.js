module.exports = {
  routes: [
    {
     method: 'POST',
     path: '/mercadopago/createPreference',
     handler: 'mercadopago.createPreference',
     config: {
       policies: [],
       middlewares: [],
       auth: false,
     },
    },

    {
      method: 'GET',
      path: '/mercadopago/webhook',
      handler: 'mercadopago.webhook',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
     },

     {
      method: 'POST',
      path: '/mercadopago/webhook',
      handler: 'mercadopago.webhook',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
     },

     {
      method: 'GET',
      path: '/mercadopago/backmp',
      handler: 'mercadopago.backmp',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
     },
  ],
};
