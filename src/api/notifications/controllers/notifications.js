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
            Date: true,
            members: true,     // Populate the location component
          },
        });
      console.log(match, 'match from sendSignupNotification');
      const signedUpUser = await strapi.query('plugin::users-permissions.user').findOne({ where: { id: userId } });
      const matchOwner = match.match_owner;
      const formattedDate = format(new Date(match.Date), "EEEE d 'a las' HH:mm", { locale: es });
  
      // Notify the match owner
      await notifyMatchOwner(matchOwner, signedUpUser, match, formattedDate, matchId);
  
      // Notify all members if the match is full
      if (match.members.length === match.ammount_players) {
        await notifyAllMembers(match.members, match, formattedDate, matchId);
      }
  
      return ctx.send({ message: 'Notifications sent successfully.' });
    } catch (error) {
      console.error('Error sending notifications:', error);
      return ctx.internalServerError('Failed to send notifications.');
    }
  }, 

  async test(ctx) {
    return ctx.send({ message: 'Test notification sent successfully' });
  }
};

// Function to send the push notification using Expo's Push Notification API
const sendPushNotification = async (expoPushToken, message, title, matchId) => {
  const payload = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: message,
    data: {
      route: '(app)/partido',  // Include a route or any data for redirection
      matchId: matchId,            // Optionally, pass the matchId or other params
    },
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

// Helper function to notify the match owner
const notifyMatchOwner = async (matchOwner, signedUpUser, match, formattedDate, matchId) => {
  if (!matchOwner.expo_pushtoken) {
    console.log('Match owner does not have an Expo push token');
    return;
  }

  const message = `${signedUpUser.firstName} se anotó para tu partido del ${formattedDate} en ${match.location?.address}.`;
  const title = `🎾 Nuevo jugador anotado en tu partido!`;

  await sendPushNotification(matchOwner.expo_pushtoken, message, title, matchId);
};

// Helper function to notify all members when the match is full
const notifyAllMembers = async (members, match, formattedDate, matchId) => {
  const fullMatchMessage = `Tu partido del ${formattedDate} en ${match.location?.address} ya tiene todos los jugadores!`;
  const fullMatchTitle = `🎾 ¡Tu partido está completo!`;

  const notificationPromises = members.map(async (member) => {
    const memberUser = await strapi.query('plugin::users-permissions.user').findOne({ where: { id: member.id } });

    if (memberUser && memberUser.expo_pushtoken) {
      console.log(`Sending notification to member: ${memberUser.firstName}`);
      await sendPushNotification(memberUser.expo_pushtoken, fullMatchMessage, fullMatchTitle, matchId);
    }
  });

  await Promise.all(notificationPromises);
};
