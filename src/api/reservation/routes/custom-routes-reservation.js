'use strict';

/**
 * Custom routes for courts
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/custom-reservation/createTransaction',
      handler: 'custom-reservation.createTransaction',  // Custom controller method
      config: {
        "policies": [],
        auth: false,  // Change to true if authentication is required
      },
    },
  ],
};
