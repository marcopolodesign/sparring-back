module.exports = {
  routes: [
    {
     method: 'POST',
     path: '/notifications/match-signup/:matchId/user/:userId',
     handler: 'notifications.sendSignupNotification',
     config: {
       policies: [],
       middlewares: [],
     },
    },
  ],
};
