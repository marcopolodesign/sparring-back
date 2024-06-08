module.exports = {
  routes: [
    {
     method: 'POST',
     path: '/bulk/bulkCreate',
     handler: 'bulk.bulkCreate',
     config: {
       policies: [],
       middlewares: [],
     },
    },
  ],
};
