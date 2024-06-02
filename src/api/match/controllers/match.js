'use strict';

/**
 * match controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::match.match', ({ strapi }) => ({
  async create(ctx) {
    // Call the default core action
    const response = await super.create(ctx);

    // Get the match owner
    const matchOwnerId = response.data.attributes.match_owner.data.id;

    // Add match owner to members if not already added
    const members = response.data.attributes.members.data.map(member => member.id);
    if (!members.includes(matchOwnerId)) {
      members.push(matchOwnerId);
    }

    // Update the match with the new members list
    await strapi.entityService.update('api::match.match', response.data.id, {
      data: {
        members: members
      }
    });

    // Return the response with updated members
    const updatedResponse = await strapi.entityService.findOne('api::match.match', response.data.id, {
      populate: ['members', 'match_owner', 'location', 'sport']
    });

    return updatedResponse;
  }
}));
