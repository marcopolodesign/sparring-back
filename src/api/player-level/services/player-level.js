'use strict';

/**
 * player-level service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::player-level.player-level');
