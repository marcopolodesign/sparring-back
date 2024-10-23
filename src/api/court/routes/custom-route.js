'use strict';

/**
 * Custom routes for courts
 */

module.exports = {
  routes: [
    {
      method: 'PUT',
      path: '/courts-custom/:courtId/generate/:trackAmount',
      handler: 'custom-court.generateTracks',  // Custom controller method
      config: {
        "policies": [],
        auth: false,  // Change to true if authentication is required
      },
    },
  ],
};
