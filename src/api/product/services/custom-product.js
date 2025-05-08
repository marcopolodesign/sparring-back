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

  async findProductByDurationAndType(duration, type, payment_method, startTime, venue, court) {
    console.log(`Searching for product ${type}-${payment_method}-${duration} with start time ${startTime}`);
  
    // const startHour = parseInt(startTime.slice(0, 2), 10);
  
    // const rushStartAm = parseInt((venue?.rush_start_am || '00:00:00').slice(0, 2), 10);
    // const rushEndAm = parseInt((venue?.rush_end_am || '00:00:00').slice(0, 2), 10);
  
    // const rushStartPm = parseInt((venue?.rush_start_pm || '00:00:00').slice(0, 2), 10);
    // const rushEndPm = parseInt((venue?.rush_end_pm || '00:00:00').slice(0, 2), 10);
  
    // const isRushHour = 
    //   (startHour >= rushStartAm && startHour < rushEndAm) || 
    //   (startHour >= rushStartPm && startHour < rushEndPm);
  
    let baseSku = `${type}-${payment_method}-${duration}`;
    if (court) {
      baseSku += `-${court}`;
    }
    console.log('Trying SKU:', baseSku);
  
    let products = await strapi.entityService.findMany('api::product.product', {
      filters: { sku: { $eq: baseSku } },
      limit: 1,
    });
  
    if (!products || products.length === 0) {
      const defaultSku = type === 'abono' ? 'abono-90' : (type === 'alquiler' ? 'alquiler-90' : 'alquiler-tranferencia-90');
      products = await strapi.entityService.findMany('api::product.product', {
        filters: { sku: { $eq: defaultSku } },
        limit: 1,
      });
    }
  
    return products[0] || null;
  }
}