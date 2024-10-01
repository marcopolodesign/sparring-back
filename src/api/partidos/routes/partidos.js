module.exports = {
  routes: [
    {
     method: 'GET',
     path: '/partidos/user/:userId', 
      handler: 'partidos.findUpcomingMatches',
     config: {
       policies: [],
       middlewares: [],
     },
    },

    {
      method: 'GET',
      path: '/partidos/:matchId',
      handler: 'partidos.getMatchDetails',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
     },

  ],
};
