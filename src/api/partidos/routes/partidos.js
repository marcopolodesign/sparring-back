module.exports = {
  routes: [
    {
     method: 'GET',
     path: '/partidos',
     handler: 'partidos.findAllMatches',
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
