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

     {
      method: "GET",
      path: "/partidos/common/:userId/:friendId",
      handler: "partidos.getCommonMatches",
      config: {
        auth: false, // Change to true if authentication is required
      },
    },


    {
      method: "GET",
      path: "/partidos/common/metrics/:userId/:friendId",
      handler: "partidos.getUserMatchMetrics",
      config: {
        auth: false, // Change to true if authentication is required
      },
    },

  ],
};
