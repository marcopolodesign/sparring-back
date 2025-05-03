'use strict';

/**
 * log-entry controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::log-entry.log-entry');
