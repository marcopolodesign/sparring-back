module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/custom-payment/chargeback/:paymentId',
      handler: 'custom-payments.chargeback',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};