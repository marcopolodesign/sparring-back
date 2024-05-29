// module.exports = {
//   routes: [
    // {
    //  method: 'GET',
    //  path: '/coaches',
    //  handler: 'coaches.exampleAction',
    //  config: {
    //    policies: [],
    //    middlewares: [],
    //  },
    // },
//   ],
// };


module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/coaches',
      handler: 'coaches.findCoaches',
      config: {
        auth: false, // Set to true if authentication is required
        policies: [],
        middlewares: [],
      },
    },
  ],
};