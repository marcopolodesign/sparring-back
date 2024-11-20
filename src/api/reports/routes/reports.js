module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/reports/sales',
      handler: 'reports.getSalesByVenue',
      config: {
        policies: [],
        middlewares: [],
      },
    },

    {
      method: 'GET',
      path: '/reports/daily-sales',
      handler: 'reports.getDailySales',
      config: {
        policies: [],
        middlewares: [],
      },
    },

      
  ],
};