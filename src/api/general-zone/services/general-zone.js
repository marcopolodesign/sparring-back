'use strict';

/**
 * general-zone service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::general-zone.general-zone');
