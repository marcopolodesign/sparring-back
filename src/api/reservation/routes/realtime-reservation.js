'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/reservations/realtime/:trackIds',
      handler: 'realtime-reservation.fetchRealtimeReservations',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/reservations/recent/:userId',
      handler: 'realtime-reservation.fetchMostRecentReservationByUser',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
