'use strict';

/**
 * Custom routes for courts
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/custom-tournament/own-tournaments/:userId',
      handler: 'custom-tournament.findTournamentByUserId',  // Custom controller method
      config: {
        "policies": [],
        auth: false,  // Change to true if authentication is required
      },
    },
     {
      method: 'POST',
      path: '/custom-tournament/shift-match-dates',
      handler: 'custom-tournament.shiftMatchDates',
      config: {
        policies: [],
        middlewares: [],
      },
    },

]};