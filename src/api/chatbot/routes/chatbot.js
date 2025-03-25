'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/chatbot',
      handler: 'chatbot.handleFlow',
      config: {
        policies: [],
        auth: false,
      },
    },
  ],
};