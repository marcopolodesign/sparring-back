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
      path: '/partidos/own-matches/:userId', 
       handler: 'partidos.findMatchesByUser',
      config: {
        policies: [],
        middlewares: [],
      },
     },

     {
      method: 'GET',
      path: '/partidos/own-matches/:userId/historic', 
       handler: 'partidos.findHistoricMatchesByUser',
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
