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
  ],
};
