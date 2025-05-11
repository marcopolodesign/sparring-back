'use strict';

/**
 * cash-movement service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::cash-movement.cash-movement');
