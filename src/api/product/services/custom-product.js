'use strict';

module.exports = {
  async getVenueRentals(venueId) {
    try {
      // 1. Buscar productos asociados al venue con tipo 'alquiler'
      const products = await strapi.entityService.findMany('api::product.product', {
        filters: {
          venues: {
            id: {
              $eq: venueId,
            },
          },
          type: {
            $eq: 'alquiler',
          },
        },
        populate: {
          custom_price: {
            populate: ['venue'],
          },
          venues: true,
        },
      });

      // 2. Traer los datos del venue para matchear nombre
      const venue = await strapi.entityService.findOne('api::court.court', venueId, {
        populate: '*',
      });
      const venueName = venue.name;

      // 3. Enriquecer productos con su precio custom si existe
      const enrichedProducts = products.map((product) => {
        const customPrices = product.custom_price || [];
        const validCustomPrices = customPrices.filter((price) => {
          return (
            price.venue !== null &&
            price.venue.name === venueName
          );
        });

        const venueSpecificPrice =
          validCustomPrices[0]?.custom_ammount || null;

        return {
          id: product.id,
          name: product.Name,
          type: product.type,
          defaultPrice: product.price,
          customPrice: venueSpecificPrice,
          venue: product.venues?.find((v) => v.id == venueId),
        };
      });

      return enrichedProducts;
    } catch (error) {
      strapi.log.error('Error in getVenueRentals:', error);
      throw error;
    }
  },

  async findProductByDurationAndType(duration, type, payment_method, timestamp) {
    console.log(`Searching for product ${type}-${payment_method}-${duration}`);
    let products = await strapi.entityService.findMany('api::product.product', {
      filters: {
      sku: { $eq: `${type}-${payment_method}-${duration}` },
      },
      limit: 1,
    });

    if (!products || products.length === 0) {
      products = await strapi.entityService.findMany('api::product.product', {
      filters: {
        sku: { $eq: 'padel-90' },
      },
      limit: 1,
      });
    }

    return products[0] || null;
  },
}