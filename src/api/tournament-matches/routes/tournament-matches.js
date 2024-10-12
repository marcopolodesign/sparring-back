module.exports = {
  routes: [
    {
     method: 'POST',
     path: '/tournament-matches/:tournamentId',
     handler: 'tournament-matches.createMatches',
     config: {
       policies: [],
       middlewares: [],
     },
    },
  ],
};
