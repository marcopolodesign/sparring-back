module.exports = {
  routes: [
    {
     method: 'POST',
     path: '/notifications/match-signup/:matchId/user/:userId',
     handler: 'notifications.sendSignupNotification',
     config: {
       policies: [],
       middlewares: [],
       auth: false,
     },
    },

    {
      method: 'POST',
      path: '/notifications/new-follower/:followerId/user/:followedUserId',
      handler: 'notifications.notifyNewFollower',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
     },

    {
      method: 'POST',
      path: '/notifications/test',
      handler: 'notifications.test',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
     },

  ],
};
