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

    {
      method: 'POST',
      path: '/custom-reservation/create-reservations/:courtId/:count',
      handler: 'custom-reservation.createRandomReservations',  // Custom controller method
      config: {
        "policies": [],
        auth: false,  // Change to true if authentication is required
      },
    },
    {
      method: 'GET',    // or POST if you prefer
      path: '/custom-reservation/check-availability/:date?/:time?/:tracks?',
      handler: 'custom-reservation.checkAvailabilityWithinPeriod',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },

    {
      method: 'GET',
      path: '/custom-reservation/check-availability/',
      handler: 'custom-reservation.checkAvailabilityWithinPeriod',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    }, 

    {
      method: 'GET',
      path: '/custom-reservation/check-venue-availability/:venueId',
      handler: 'custom-reservation.getVenueRentals',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    }, 

    {
      method: 'GET', 
      path: '/custom-reservation/get-availability/:venueId/:trackIds?/:date?/:time?',
      handler: 'custom-reservation.getTrackAvailability',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    }, 

    {
      method: 'GET',
      path: '/reservations/future/:userId',
      handler: 'custom-reservation.getFutureReservations',
      config: {
        auth: false, // Adjust if you want to add auth later
      },
    },

    {
      method: 'GET',
      path: '/reservations/venue-availability/:venueId',
      handler: 'custom-reservation.getVenueAvailability',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    

    {
      method: 'GET',
      path: '/reservations/venue-daily-availability/:venueId',
      handler: 'custom-reservation.getDailyVenueAvailability',
      config: {
        policies: [],
        middlewares: [],
      },
    },

    {
      method: 'POST',
      path: '/reservation/reserve',
      handler: 'custom-reservation.createReserve',
      config: {
        auth: false
      },
    },


  ],
};
