'use strict';
const axios = require('axios');
const { format } = require('date-fns');
const { es } = require('date-fns/locale');



module.exports = {
  async sendSignupNotification(ctx) {
    const { matchId, userId } = ctx.params;
    
    console.log(matchId, userId, 'matchId, userId from sendSignupNotification');

    try {
      // Fetch match details (including the match owner) and user who signed up
      const match = await strapi.query('api::match.match').findOne({
        where: { id: matchId },
          populate: {
            match_owner: true,  // Populate the match_owner relation
            location: true, 
            Date: true,    // Populate the location component
          },
        });
      console.log(match, 'match from sendSignupNotification');

      // Step 1: Fetch the signed-up user using the correct query
    const signedUpUser = await strapi.query('plugin::users-permissions.user').findOne({
      where: { id: userId },  // Fetch the user by ID passed in the request
    });
    console.log(signedUpUser, 'SIGNED UP USER from sendSignupNotification');

    // Step 2: Fetch the match owner (already populated in the match query)
    const matchOwner = match.match_owner;  // Access the populated match_owner
    console.log(matchOwner, 'MATCH OWNER from sendSignupNotification');

      // Check if the match owner has an Expo push token
      if (!matchOwner || !matchOwner.expo_pushtoken) {
        return ctx.badRequest('Match owner does not have an Expo push token');
      }

      const formattedDate = format(new Date(match.Date), "EEEE d 'a las' HH:mm", { locale: es });

      // Prepare the notification message
      const message = `${signedUpUser.firstName} se anotó para tu partido del ${formattedDate} en ${match.location?.address}.`;
      const title = `🎾 Nuevo jugador anotado en tu partido!`;

      // Send the push notification to the match owner using Expo's API
      await sendPushNotification(matchOwner.expo_pushtoken, message, title);

      return ctx.send({ message: 'Notification sent successfully' });
    } catch (error) {
      console.error('Error sending notification:', error);
      return ctx.internalServerError('Failed to send notification');
    }
  }, 

  async test(ctx) {
    return ctx.send({ message: 'Test notification sent successfully' });
  }
};

// Function to send the push notification using Expo's Push Notification API
const sendPushNotification = async (expoPushToken, message, title) => {
  const payload = {
    to: expoPushToken,
    sound: 'default',
    title: title,
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
