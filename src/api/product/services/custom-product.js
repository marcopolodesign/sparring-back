'use strict';

module.exports = {
  async getVenueRentals(venueId) {
    try {
      // Fetch products by venue ID and type 'alquiler'
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
          custom_stock: {
            populate: ['venue'],
          },
          venues: true,
        },
      });
  
      // 2. Fetch venue details to verify the venue name.
      const venue = await strapi.entityService.findOne('api::court.court', venueId, {
        populate: '*',
      });
      const venueName = venue.name;
  
      // 3. Map through products and attach custom prices specific to the venue.
      const enrichedProducts = products.map((product) => {
        const customPrices = product.custom_price || [];
        // Filter custom prices where the price is set for the given venue.
        const validCustomPrices = customPrices.filter((price) => {
          return (
            price.venue !== null && // Ensure the price has a venue
            price.venue.name === venueName // Must match venue name
          );
        });
  
        // Get the first valid custom price, or null if none exist.
        const venueSpecificPrice =
          validCustomPrices[0]?.custom_ammount || null;
  
        // stock logic (mirror price logic)
        const customStocks = product.custom_stock || [];
        const validCustomStocks = customStocks.filter((stock) => {
          return (
            stock.venue !== null &&
            stock.venue.name === venueName
          );
        });
        const venueSpecificStock = validCustomStocks[0]?.amount || null;
  
        return {
          id: product.id,
          name: product.Name, // Assumes product name is stored in "Name"
          type: product.type,
          defaultPrice: product.price,
          customPrice: venueSpecificPrice,
          customStock: venueSpecificStock,
          // Optionally, attach venue details for the product.
          venue: product.venues?.find((v) => v.id == venueId),
        };
      });
  
      return enrichedProducts;
    } catch (error) {
      strapi.log.error('Error fetching rentals by venue ID:', error);
      throw error;
    }
  },

  async findProductByDurationAndType(duration, type, payment_method, startTime, venue, court, student_amount) {
    console.log(`Searching for product ${type}-${payment_method}-${duration} with start time ${startTime}`);
  
    // const startHour = parseInt(startTime.slice(0, 2), 10);
  
    // const rushStartAm = parseInt((venue?.rush_start_am || '00:00:00').slice(0, 2), 10);
    // const rushEndAm = parseInt((venue?.rush_end_am || '00:00:00').slice(0, 2), 10);
  
    // const rushStartPm = parseInt((venue?.rush_start_pm || '00:00:00').slice(0, 2), 10);
    // const rushEndPm = parseInt((venue?.rush_end_pm || '00:00:00').slice(0, 2), 10);
  
    // const isRushHour = 
    //   (startHour >= rushStartAm && startHour < rushEndAm) || 
    //   (startHour >= rushStartPm && startHour < rushEndPm);

    let baseSku;
    console.log('student_amount', student_amount);

    if (student_amount) {
      // If student_amount is provided, the type must be 'clase'
      type = 'clase';
      baseSku = `${type}-${duration}-${student_amount}`;
    } else {
      // Existing baseSku logic
      baseSku = payment_method 
        ? `${type}-${payment_method}-${duration}` 
        : `${type}-${duration}`;
      if (court) {
        baseSku += `-${court}`;
      }
    }
  
    console.log('Trying SKU:', baseSku);
  
    let products = await strapi.entityService.findMany('api::product.product', {
      filters: { sku: { $eq: baseSku } },
      limit: 1,
    });


  
    if (!products || products.length === 0) {
      const defaultSku = type === 'abono' ? `abono-${duration}` : (type === 'alquiler' ? `alquiler-${duration}` : 'alquiler-tranferencia-90');
      products = await strapi.entityService.findMany('api::product.product', {
        filters: { sku: { $eq: defaultSku } },
        limit: 1,
      });
    }
  
    return products[0] || null;
  }
}