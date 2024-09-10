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
  ],
};
