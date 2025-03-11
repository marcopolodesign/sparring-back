module.exports = {
  routes: [
    {
     method: 'POST',
     path: '/aob/delete-account/:userId',
     handler: 'aob.deleteAccount',
     config: {
      auth: { scope: ["api::custom-user.custom-user"] },
       policies: [],
       middlewares: [],
     },
    },
  ],
};
