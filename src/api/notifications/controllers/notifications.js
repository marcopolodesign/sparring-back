'use strict';
const axios = require('axios');

module.exports = {
  async sendSignupNotification(ctx) {
    const { matchId, userId } = ctx.request.body;

    try {
      // Fetch match details (including the match owner) and user who signed up
      const match = await strapi.query('api::match.match').findOne(matchId);
      console.log(match, 'match from sendSignupNotification');

      const signedUpUser = await strapi.query('plugin::users-permissions.user').findOne(userId);
      console.log(signedUpUser, 'signedUpUser from sendSignupNotification');
      const matchOwner = await strapi.query('plugin::users-permissions.user').findOne(match.match_owner.id);
      console.log(matchOwner, 'matchOwner from sendSignupNotification');

      // Check if the match owner has an Expo push token
      if (!matchOwner || !matchOwner.expo_pushtoken) {
        return ctx.badRequest('Match owner does not have an Expo push token');
      }

      // Prepare the notification message
      const message = `${signedUpUser.firstName} se anotó para tu partido del ${match.date} en ${match.location?.address}.`;

      // Send the push notification to the match owner using Expo's API
      await sendPushNotification(matchOwner.expo_pushtoken, message);

      return ctx.send({ message: 'Notification sent successfully' });
    } catch (error) {
      console.error('Error sending notification:', error);
      return ctx.internalServerError('Failed to send notification');
    }
  }
};

// Function to send the push notification using Expo's Push Notification API
const sendPushNotification = async (expoPushToken, message) => {
  const payload = {
    to: expoPushToken,
    sound: 'default',
    title: 'New Signup for Your Match!',
    body: message,
    data: { someData: 'extraData' },  // Add any extra data if needed
  };

  try {
    const response = await axios.post('https://exp.host/--/api/v2/push/send', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Push notification sent:', response.data);
  } catch (error) {
    console.error('Error sending push notification:', error.response ? error.response.data : error.message);
  }
};
