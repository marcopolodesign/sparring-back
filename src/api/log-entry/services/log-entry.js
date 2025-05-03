'use strict';

/**
 * log-entry service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::log-entry.log-entry');
