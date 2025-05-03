'use strict';

/**
 * log-entry router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::log-entry.log-entry');
