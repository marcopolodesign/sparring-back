'use strict';

/**
 * A set of functions called "actions" for `auth`
 */

const jwt = require('jsonwebtoken');

module.exports = {
    // async googleAuthCallback(ctx) {
    //   try {
    //     const { access_token } = ctx.query;
  
    //     // Log the received token
    //     if (!access_token) {
    //       strapi.log.error('Access token is missing in the request');
    //       ctx.throw(400, 'Access token is required');
    //     }
  
    //     strapi.log.info('Received access token:', access_token);
  
    //     // Here, validate the access token with Google's API
    //     // Optionally decode the token using a library like `jsonwebtoken`
  
    //     // Example for validation (not required, but useful for debugging):
    //     const userInfo = jwt.decode(access_token, { complete: true });
    //     strapi.log.info('Decoded Token Info:', userInfo);
  
    //     // Continue with your business logic
    //     // E.g., find or create the user in your database
    //     // Return the user and token if successful
    //   } catch (error) {
    //     strapi.log.error('Google Auth Callback Error:', error.message);
    //     ctx.badRequest('Authentication failed', { error: error.message });
    //   }
    // },
  };