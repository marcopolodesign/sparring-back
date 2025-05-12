'use strict';

/**
 * client-custom-stock service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::client-custom-stock.client-custom-stock');
