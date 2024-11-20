'use strict';

/**
 * Custom routes for courts
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/custom-transactions/details',
      handler: 'custom-transaction.getTransactionDetails',  // Custom controller method
      config: {
        "policies": [],
        auth: false,  // Change to true if authentication is required
      },
    },
  ],
};
