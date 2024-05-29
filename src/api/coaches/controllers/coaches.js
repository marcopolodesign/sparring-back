'use strict';

/**
 * A set of functions called "actions" for `coaches`
 */

// module.exports = {
  // exampleAction: async (ctx, next) => {
  //   try {
  //     ctx.body = 'ok';
  //   } catch (err) {
  //     ctx.body = err;
  //   }
  // }
// };

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('plugin::users-permissions.user', ({ strapi }) => ({
  async findCoaches(ctx) {
    try {
      const coaches = await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: { coach: true },
        populate: 'profilePicture',
      });
      ctx.body = coaches;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
}));


