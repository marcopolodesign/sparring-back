'use strict';
// @ts-ignore
// @ts-ignore
const qs = require('qs');
// @ts-ignore
// @ts-ignore
const { parseISO, addMinutes, subMinutes, format, differenceInMinutes, isBefore, parse,  startOfDay, isToday, addHours, isAfter } = require('date-fns');
const { es } = require('date-fns/locale');
const { toZonedTime  } = require('date-fns-tz');
/**
 * reservation controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

const DEFAULT_START_SLOT = 480; // 8:00 in minutes
const DEFAULT_END_SLOT = 1380;  // 23:00 in minutes


// Define your timezone (e.g., for Argentina)
const TIMEZONE = 'America/Argentina/Buenos_Aires';

const formatToTimezone = (date, formatStr) => {
  const zonedDate = toZonedTime(date, TIMEZONE);
  return format(zonedDate, formatStr);
};


/**
 * Helper: Converts a time string "HH:mm" to minutes past midnight.
 * @param {string} timeStr - e.g. "20:00"
 * @returns {number} Minutes past midnight.
 */
const convertTimeToMinutes = (timeStr) => {
  const [hour, minute] = timeStr.split(':').map(Number);
  return hour * 60 + minute;
};

/**
 * Helper: Rounds the given time (in minutes) to the next half-hour slot.
 * E.g., 1210 minutes (20:10) becomes 1230 minutes (20:30).
 *
 * @param {number} minutes
 * @returns {number} Rounded minutes value.
 */
const roundToNextHalfHour = (minutes) => {
  if (minutes % 30 === 0) return minutes;
  return minutes + (30 - (minutes % 30));
};

/**
 * Helper: Generates an array of valid timeslots (in minutes) from DEFAULT_START_SLOT to DEFAULT_END_SLOT.
 *
 * @returns {number[]} Array of timeslots.
 */
const generateTimeslots = () => {
  const slots = [];
  for (let m = DEFAULT_START_SLOT; m <= DEFAULT_END_SLOT; m += 30) {
    slots.push(m);
  }
  return slots;
};

const timeslots = generateTimeslots();

/**
 * Helper: Converts minutes (from midnight) to a readable "HH:mm" format using date-fns.
 * @param {number} minutes
 * @returns {string} e.g. "20:30"
 */
function convertMinutesToReadable(minutes) {
  const dayStart = startOfDay(new Date());
  return format(addMinutes(dayStart, minutes), 'HH:mm');
}


/**
 * Helper: Matches durations to products.
 *
 * It receives an array of durations (in minutes) and uses the global `products`
 * array (fetched via getVenueRentals) to match a product.
 */
const matchProductsWithDurations = (durations, products) => {
  return durations.map((duration) => {
    // Assumes product name format is like "padel-60" (or "padel 60") so that splitting gives the duration.
    const matchedProduct = products.find(
      (product) => parseInt(product.name.split(' ')[1]) === duration
    );
    return matchedProduct
      ? {
          id: matchedProduct.id,
          name: matchedProduct.name,
          duration,
          price: matchedProduct.customPrice || matchedProduct.defaultPrice,
        }
      : null;
  }).filter(Boolean);
};


// Helper getVenueRentals
const getVenueRentals = async (venueId) => {
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
}


const formatCurrency = (amount) => {
  return `$${amount.toLocaleString('es-AR')}`;
};


const DAYS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MONTHS = [
  'enero','febrero','marzo','abril','mayo',
  'junio','julio','agosto','septiembre','octubre',
  'noviembre','diciembre'
];


function formatSpanishDate(date) {
  const weekday = DAYS[date.getDay()];
  const day = date.getDate();
  // sólo el día 1º ponemos "1ro"
  const dayStr = (day === 1 ? '1ro' : day);
  const month = MONTHS[date.getMonth()];
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${weekday} ${dayStr} de ${month} ${hh}:${mm}`;
}



module.exports = createCoreController('api::reservation.reservation', ({ strapi }) => ({
  async createTransaction(ctx) {
    // Llamar al método base para crear la reserva
    const { data, meta } = await super.create(ctx);

    strapi.log.info('Reservation created:', data);
    console.log('Meta:', meta);

    // Lógica para crear una venta automáticamente después de la reserva
    try {
      const transactionDetails = {
        reservationId: data.id,
        // userId: ctx.request.body.data.user, // Asegúrate de que el id del usuario se pase en la solicitud de reserva
        // amount: ctx.request.body.data.amount, // O define un valor fijo
        description: `Venta asociada a la reserva ${data.id}`,
        date: new Date().toISOString(),
      };

      await strapi.service('api::transactions.transaction').create({ data: transactionDetails });

      // Devolver la reserva creada
      return { data, meta };
    } catch (error) {
      strapi.log.error('Error creando la venta asociada a la reserva:', error);
      throw new Error('Error creando la venta asociada a la reserva. en custom-transaction');
    }
  },

  async createRandomReservations(ctx) {
    const { courtId, count } = ctx.params;

    // Validate input
    if (!courtId || !count) {
      return ctx.badRequest('Missing required fields: courtId and count.');
    }

    try {
      // Ensure the court exists
      const court = await strapi.entityService.findOne('api::court.court', courtId);
      if (!court) {
        return ctx.notFound('Court not found.');
      }

      // Fetch all products (padel-60, padel-90, padel-120)
      const products = await strapi.entityService.findMany('api::product.product', {
        filters: {
          sku: {
            $in: ['padel-60', 'padel-90', 'padel-120'],
          },
        },
        populate: '*',
      });

      if (products.length === 0) {
        return ctx.notFound('No matching products found.');
      }

      // Fetch all users to assign as random owners
      const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
        limit: 100, // Fetch up to 100 users
      });

      if (users.length === 0) {
        return ctx.notFound('No users found to assign as owners.');
      }

      const reservations = [];

      for (let i = 0; i < count; i++) {
        // Select a random user as the owner
        const randomOwner = users[Math.floor(Math.random() * users.length)];

        // Select a random product and match its duration
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        const duration = randomProduct.sku === 'padel-60' ? 60 : randomProduct.sku === 'padel-90' ? 90 : 120;

        // Generate random start and end times
        const startHour = Math.floor(Math.random() * 10) + 8; // Random hour between 8 AM and 6 PM
        const startTime = new Date();
        startTime.setHours(startHour, 0, 0, 0);

        const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

        // Select a random seller
        const randomSeller = users[Math.floor(Math.random() * users.length)];

        // Create the reservation
        const reservationData = {
          date: startTime.toISOString().split('T')[0], // Extract date as YYYY-MM-DD
          start_time: startTime.toISOString().split('T')[1], // Extract time as HH:mm:ss
          end_time: endTime.toISOString().split('T')[1], // Extract time as HH:mm:ss
          duration,
          // type: 'alquiler',
          owner: randomOwner.id,
          court: courtId,
          products: [randomProduct.id],
          seller: randomSeller.id,
          // status: 'pending', // Ensure this matches the enumeration field in Strapi
        };

        const newReservation = await strapi.entityService.create('api::reservation.reservation', {
          data: reservationData,
        });

        // Create the associated transaction
        const transactionData = {
          reservation: newReservation.id,
          amount: randomProduct.price,
          payment_method: null, // Default null, adjust as needed
          // status: 'pending_payment',
          date: new Date().toISOString(),
          // source: 'sparring-club',
        };

        const newTransaction = await strapi.entityService.create('api::transaction.transaction', {
          data: transactionData,
        });

        reservations.push({
          reservation: newReservation,
          transaction: newTransaction,
        });
      }

      // Return the created reservations
      ctx.body = {
        message: `${count} random reservations created successfully for court ${courtId}.`,
        reservations,
      };
    } catch (error) {
      console.error('Error creating random reservations:', error);
      ctx.throw(500, 'Failed to create random reservations.');
    }
  },

  async checkAvailabilityWithinPeriod(ctx) {
    try {
      let { date, time, tracks } = ctx.params; // from URL params
      const now = new Date();
      const currentHour = now.getHours();

      console.log(tracks, 'tracks checked for availability');

      // ----------------------------------------------------------------
      // 1) Resolve date/time
      // ----------------------------------------------------------------
      const noDate = !date || date === 'undefined' || date === ':date';
      const noTime = !time || time === 'undefined' || time === ':time?';

      if (noDate && noTime) {
        if (currentHour >= 23) {
          const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          const yyyy = tomorrow.getFullYear();
          const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
          const dd = String(tomorrow.getDate()).padStart(2, '0');
          date = `${yyyy}-${mm}-${dd}`;
          time = '08:00';
        } else {
          if (currentHour < 8) {
            now.setHours(8, 0, 0, 0);
          }
          const currentMinutes = now.getMinutes();
          const nextHalfHour = currentMinutes < 30 ? 30 : 60;
          now.setMinutes(nextHalfHour, 0, 0);
          

          const yyyy = now.getFullYear();
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          date = `${yyyy}-${mm}-${dd}`;

          const hh = String(now.getHours()).padStart(2, '0');
          const minStr = String(now.getMinutes()).padStart(2, '0');
          time = `${hh}:${minStr}`;
        }
      } else {
        if (noDate) {
          const yyyy = now.getFullYear();
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          date = `${yyyy}-${mm}-${dd}`;
        }
        if (noTime) {
          if (currentHour < 8) {
            now.setHours(8, 0, 0, 0);
          }
          const currentMinutes = now.getMinutes();
          const nextHalfHour = currentMinutes < 30 ? 30 : 60;
          now.setMinutes(nextHalfHour, 0, 0);

          const hh = String(now.getHours()).padStart(2, '0');
          const minStr = String(now.getMinutes()).padStart(2, '0');
          time = `${hh}:${minStr}`;
        }
      }

      // Build baseDate from date + time
      const baseDateString = `${date}T${time}:00.000`; // naive approach
      const baseDate = new Date(baseDateString);

      // Desde aca se controla cuanto para adelante y cuanto para atras ----------------------------------------------------------------
      // 2) +/- 90 minutes logic
      // ----------------------------------------------------------------
      const startTime = subMinutes(baseDate, 90);
      const endTime = addMinutes(baseDate, 240); // 4 hours = 240 minutes

      // ----------------------------------------------------------------
      // 3) Resolve tracks
      // ----------------------------------------------------------------
      let trackIds = [];
      if (!tracks || tracks === 'undefined' || tracks === ':tracks') {
        console.log('no tracks!')
        const allTracksInSystem = await strapi.entityService.findMany('api::track.track', {
          fields: ['id'],
        });
        // @ts-ignore
        trackIds = allTracksInSystem.map((t) => t.id);
      } else {
        trackIds = tracks.split(',').map((t) => parseInt(t, 10));
        console.log
      }

      // ----------------------------------------------------------------
      // 4) Build reservedSlotsMap for each track
      // ----------------------------------------------------------------
      const reservedSlotsMap = {};
      for (const trackId of trackIds) {
        reservedSlotsMap[trackId] = new Set();
      }

      // 4a) Actually fetch reservations for this date & these tracks
      const allReservations = await strapi.entityService.findMany('api::reservation.reservation', {
        filters: {
          date: date,
          court: {
            id: {
              $in: trackIds,
            },
          },
        },
        populate: {
          court: true,
          venue: true,
        },
      });

      // 4b) Convert each reservation into half-hour increments
      for (const r of allReservations) {
        if (!r.start_time || !r.end_time || !r.court) continue;

        const trackId = r.court.id;

        const startTimeString = r.start_time.toString();
        const endTimeString = r.end_time.toString();
        const [startHour, startMinute] = startTimeString.split(':').map(Number);
        const [endHour, endMinute] = endTimeString.split(':').map(Number);

        let startMins = startHour * 60 + startMinute;
        const endMins = endHour * 60 + endMinute;

        while (startMins < endMins) {
          reservedSlotsMap[trackId].add(startMins);
          startMins += 30;
        }
      }

      // ----------------------------------------------------------------
      // 5) Build list of half-hour increments within [startTime, endTime]
      // ----------------------------------------------------------------
      const timeslots = [];
      for (let mins = 8 * 60; mins <= 23 * 60; mins += 30) {
        timeslots.push(mins);
      }

      const isToday = (() => {
        const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
        return date === todayStr;
      })();

      const nowInMinutes = now.getHours() * 60 + now.getMinutes();

       const startMinsRange = startTime.getHours() * 60 + startTime.getMinutes();
       const endMinsRange = endTime.getHours() * 60 + endTime.getMinutes();

      // Build "results" => one item per track
      const results = [];
      for (const trackId of trackIds) {
        const increments = [];
        for (const slot of timeslots) {
          if (isToday && slot < nowInMinutes) {
            continue;
          }
          if (slot < startMinsRange || slot > endMinsRange) {
            continue;
          }
          // If track is reserved, skip
          const isReserved = reservedSlotsMap[trackId].has(slot);
          if (!isReserved) {
            const hh = String(Math.floor(slot / 60)).padStart(2, '0');
            const mm = String(slot % 60).padStart(2, '0');
            increments.push(`${hh}:${mm}`);
          }
        }

        // get the track entity with venue
        const trackEntity = await strapi.entityService.findOne('api::track.track', trackId, {
          fields: ['id', 'name'],
          populate: { venue: true },
        });

        // @ts-ignore
        const venueObj = trackEntity?.venue ?? null;

        results.push({
          // @ts-ignore
          id: trackEntity?.id || trackId,
          // @ts-ignore
          name: trackEntity?.name || `Track ${trackId}`,
          availability: increments,
          venue: venueObj
            ? { id: venueObj.id, name: venueObj.name }
            : null,
        });
      }

      // ----------------------------------------------------------------
      // A) Group the results by venue
      // ----------------------------------------------------------------
      const venueMap = new Map();
      for (const trackResult of results) {
        const { venue } = trackResult;
        if (!venue) {
          // If there's no venue in track, skip or handle differently
          continue;
        }
        const venueId = venue.id;
        if (!venueMap.has(venueId)) {
          venueMap.set(venueId, {
            venueName: venue.name,
            venueId: venueId,
            trackResults: [],
          });
        }
        venueMap.get(venueId).trackResults.push(trackResult);
      }

      // ----------------------------------------------------------------
      // B) Compute "venueAvaiability" = union of track avails
      // ----------------------------------------------------------------
      function unionOfTimes(arrayOfTimeArrays) {
        const combined = arrayOfTimeArrays.flat();
        const set = new Set(combined);
        return [...set].sort();
      }

      const finalVenues = [];
      for (const [venueId, venueInfo] of venueMap.entries()) {
        const { venueName, trackResults } = venueInfo;
        const allAvailabilityArrays = trackResults.map((tr) => tr.availability);
        const venueAvaiability = unionOfTimes(allAvailabilityArrays);

        finalVenues.push({
          venue: venueName,
          venueAvaiability,
          venueId,
          results: trackResults,
        });
      }

      // ----------------------------------------------------------------
      // C) Merge with allVenues => return the FULL Strapi shape
      // ----------------------------------------------------------------
      // 1) Fetch ALL venues with their normal Strapi attributes
      //    so we can keep amenities, location, etc.
      const allVenues = await strapi.entityService.findMany('api::court.court', {
        populate: '*',  // or a detailed object specifying each relation
      });

      // 2) Build an array in the Strapi shape: [{ id, attributes: {...} }, ...]
      const merged = allVenues.map((v) => {
        // v is a plain JS object with all fields (including .id, .name, etc.)
        // We want: "id" plus an "attributes" object that has everything else.
        const found = finalVenues.find((fv) => fv.venueId === v.id);

        // The "attributes" object is basically everything from "v" except the "id".
        // If you need EXACT Strapi shape, you do something like:
        const { id, ...restFields } = v; // remove id

        // We'll insert "venueAvaiability" + "results" if found, else empty arrays
        const venueAvaiability = found ? found.venueAvaiability : [];
        const results = found ? found.results : [];

        // Return the standard Strapi shape: { id, attributes: {...} }
        return {
          id: v.id,
          attributes: {
            ...restFields,   // all the existing fields from the DB
            venueAvaiability,
            results,
          },
        };
      });

      // Finally, return the array
      return ctx.send(merged);
    } catch (err) {
      console.error('Error in checkAvailabilityWithinPeriod:', err);
      return ctx.badRequest('Something went wrong.');
    }
  },

  async getVenueRentals(ctx) {
    // Extract venueId from URL parameters
    const { venueId } = ctx.params;

    try {
      // 1. Fetch products where:
      //    - the 'venues' relation includes the provided venueId
      //    - the type equals 'alquiler'
      //    Populate custom_price.venue and venues relations.
      const products = await strapi.entityService.findMany('api::product.product', {
        filters: {
          venues: { id: { $eq: venueId } },
          type: { $eq: 'alquiler' },
        },
        populate: ['custom_price.venue', 'venues'],
      });

      // 2. Fetch the court/venue data for name verification
      const venue = await strapi.entityService.findOne('api::court.court', venueId);
      if (!venue) {
        return ctx.notFound('Venue not found.');
      }
      const venueName = venue.name;

      // 3. Map through the fetched products and attach the venue-specific custom price
      const enrichedProducts = products.map((product) => {
        // console.log(product, 'PRODUCT')
        // @ts-ignore
        const customPrices = product.custom_price || [];

        // Filter valid custom prices:
        // Exclude prices with a null venue and keep only those where the venue name matches.
        const validCustomPrices = customPrices.filter((price) => {
          // console.log(price, 'PRICE')

          const priceVenueData = price.venue || null;
          return (
            priceVenueData !== null &&
            priceVenueData.name === venueName
          );
        });

        // Use the first valid custom price found (if any)
        const venueSpecificPrice =
          validCustomPrices[0]?.custom_ammount || null;

        // Build the enriched product object
        return {
          // @ts-ignore
          id: product.id,
          // @ts-ignore
          name: product.Name,
          // @ts-ignore
          sku: product.sku,
        // @ts-ignore
          type: product.type,
          // @ts-ignore
          defaultPrice: product.price,
          customPrice: venueSpecificPrice,
          // Find the specific venue within the product's venues relation:
          venue:
          // @ts-ignore
            product.venues?.find((v) => v.id == venueId) ||
            null,
        };
      });

      // Return the enriched products as the response
      ctx.send(enrichedProducts);
    } catch (error) {
      strapi.log.error('Error fetching rentals by venue ID:', error);
      ctx.throw(500, 'Error fetching rentals by venue ID.');
    }
  },

  async getTrackAvailability(ctx) {
    try {
      // 1. Get parameters from ctx.params or default them.
      let { venueId, trackIds, date, time } = ctx.params;
  
      if (!trackIds) {
        return ctx.throw(400, 'Missing trackIds parameter');
      }
      // Convert trackIds string into an array.
      trackIds = trackIds.split(',').map(id => id.trim());
  
      // Date: default to today if not provided.
      const selectedDate = date ? new Date(date) : new Date();
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  
      // Time: if not provided, default to current time (rounded if today, else start at DEFAULT_START_SLOT).
      let chosenTimeMinutes;
      if (time) {
        chosenTimeMinutes = convertTimeToMinutes(time);
      } else {
        const now = new Date();
        chosenTimeMinutes = isToday(selectedDate)
          ? roundToNextHalfHour(now.getHours() * 60 + now.getMinutes())
          : DEFAULT_START_SLOT;
      }

       // 2. Fetch reservations for the given tracks and date.
    // Build the query similar to the frontend implementation.
    const reservationQuery = {
      filters: {
        court: {
          id: {
            $in: trackIds,
          },
        },
        date: {
          $eq: formattedDate,
        },
      },
      populate: {
        court: true,
      },
    };

    // Use Strapi’s entity service (adjust according to your Strapi version).
    const reservationsResponse = await strapi.entityService.findMany(
      'api::reservation.reservation',
      reservationQuery
    );

     // 3. Build a reserved slots map (using a Set for each track).
     const reservedSlotsMap = {};
     trackIds.forEach(trackId => {
       reservedSlotsMap[trackId] = new Set();
     });
 
     reservationsResponse.forEach((reservation) => {
       // Adjust based on your data model.
       const resAttrs = reservation;
       const trackId = resAttrs.court?.id?.toString();
       if (trackId && resAttrs.start_time && resAttrs.end_time) {
         const startTime = convertTimeToMinutes(resAttrs.start_time.toString().slice(0, 5));
         const endTime = convertTimeToMinutes(resAttrs.end_time.toString().slice(0, 5));
 
         for (let t = startTime; t < endTime; t += 30) {
           if (reservedSlotsMap[trackId]) {
             reservedSlotsMap[trackId].add(t);
           }
         }
       }
     });
 
        // 4. Fetch products for the given venue.
        const products = await getVenueRentals(venueId);

        // 5. For each track and each allowed duration, check availability and match to a product.
        const allowedDurations = [60, 90, 120];
        const tracksAvailability = [];
    
        trackIds.forEach((trackId, i) => {
          const availableDurations = [];
          allowedDurations.forEach((duration) => {
            let isValid = true;
            // Check each half-hour block for this duration.
            for (let offset = 0; offset < duration; offset += 30) {
              const checkSlot = chosenTimeMinutes + offset;
              if (
                !timeslots.includes(checkSlot) ||
                reservedSlotsMap[trackId].has(checkSlot)
              ) {
                isValid = false;
                break;
              }
            }
            if (isValid) {
              availableDurations.push(duration);
            }
          });
          // Use the helper to convert durations to product objects.
          const matchedProducts = matchProductsWithDurations(availableDurations, products);
    
          // Here we're returning the track number (or identifier) along with the matched products.
          tracksAvailability.push({
            track: `Cancha ${i + 1}`,
            trackId: trackId,
            products: matchedProducts,
          });
        });

    ctx.send({
      date: formattedDate,
      requestedTime: convertMinutesToReadable(chosenTimeMinutes),
      tracksAvailability,
    });
    } catch (error) {
      strapi.log.error('Error fetching track availability:', error);
      ctx.throw(500, 'Error fetching track availability.');
    }
  }, 

  async getFutureReservations(ctx) {
    const { userId } = ctx.params; // userId sent in the request body
    if (!userId) {
      return ctx.badRequest('Missing userId');
    }

    try {
      const now = new Date();
      const nowInZone = toZonedTime(now, TIMEZONE);

      const reservations = await strapi.entityService.findMany('api::reservation.reservation', {
        filters: {
          owner: { id: { $eq: userId } },
        },
        populate: {
          court: true,
          products: true,
        },
        sort: ['date:asc', 'start_time:asc'],
      });

      const futureReservations = reservations
        .filter((reservation) => {
          const { date, start_time, end_time } = reservation;
          const startDateTime = parseISO(`${date}T${start_time}`);
          const zonedStartTime = toZonedTime(startDateTime, TIMEZONE);

          // Calculate end time (assuming it's stored in the same format as start_time)
          const endDateTime = parseISO(`${date}T${end_time}`);
          const zonedEndTime = toZonedTime(endDateTime, TIMEZONE);

          // Check if the reservation ends at least 2 hours into the future
          const endPlusTwoHours = addHours(zonedEndTime, 2);

          return isAfter(endPlusTwoHours, nowInZone);
        })
        .map((reservation) => {
          const { date, start_time, end_time, court, products } = reservation;

          const startDateTime = parseISO(`${date}T${start_time}`);
          const endDateTime = parseISO(`${date}T${end_time}`);

          // Format date and time
          const formattedStartTime = format(startDateTime, 'HH:mm');
          const formattedEndTime = format(endDateTime, 'HH:mm');
          const formattedDate = format(startDateTime, "EEEE d 'de' MMMM", { locale: es });
          
          const productPrice = products?.[0]?.price ?? 0;
          const formattedPrice = formatCurrency(productPrice);


          // Build response object
          return {
            start_time: formattedStartTime,
            end_time: formattedEndTime,
            date: formattedDate,
            court_name: court?.name ?? 'Sin nombre',
            product_price: formattedPrice,
          };
        });

      return ctx.send(futureReservations);
    } catch (error) {
      strapi.log.error('Error fetching future reservations:', error);
      return ctx.internalServerError('Failed to fetch future reservations');
    }
  },

  async getVenueAvailability(ctx) {
    const { venueId } = ctx.params;
    try {
      const now = toZonedTime(new Date(), TIMEZONE); // Adjust now to the specified timezone
      const currentDate = formatToTimezone(now, 'yyyy-MM-dd'); // Current date in timezone
      const currentTimeMinutes = roundToNextHalfHour(now.getHours() * 60 + now.getMinutes()); // Current time rounded to the next half-hour

      const startTime = toZonedTime(subMinutes(now, 90), TIMEZONE); // 90 minutes before current time
      const endTime = toZonedTime(addMinutes(now, 240), TIMEZONE); // 4 hours after current time

      // Fetch all tracks in the system filtered by venueId
      const allTracks = await strapi.entityService.findMany('api::track.track', {
        fields: ['id', 'name'],
        filters: {
          venue: {
            id: {
              $eq: venueId,
            },
          },
        },
        populate: { venue: true },
      });

      // @ts-ignore
      const trackIds = allTracks.map((track) => track.id);

      // Build reservedSlotsMap for each track
      const reservedSlotsMap = {};
      for (const trackId of trackIds) {
        reservedSlotsMap[trackId] = new Set();
      }

      // Fetch reservations for the current date and all tracks
      const allReservations = await strapi.entityService.findMany('api::reservation.reservation', {
        filters: {
          date: currentDate,
          court: {
            id: {
              $in: trackIds,
            },
          },
        },
        populate: {
          court: true,
        },
      });

      // Convert each reservation into half-hour increments
      for (const reservation of allReservations) {
        if (!reservation.start_time || !reservation.end_time || !reservation.court) continue;

        const trackId = reservation.court.id;

        const startTimeString = reservation.start_time.toString();
        const endTimeString = reservation.end_time.toString();
        const [startHour, startMinute] = startTimeString.split(':').map(Number);
        const [endHour, endMinute] = endTimeString.split(':').map(Number);

        let startMins = startHour * 60 + startMinute;
        const endMins = endHour * 60 + endMinute;

        while (startMins < endMins) {
          reservedSlotsMap[trackId].add(startMins);
          startMins += 30;
        }
      }

      // Build list of half-hour increments within [startTime, endTime]
      const timeslots = [];
      for (let mins = 8 * 60; mins <= 23 * 60; mins += 30) {
        timeslots.push(mins);
      }

      const startMinsRange = startTime.getHours() * 60 + startTime.getMinutes();
      const endMinsRange = endTime.getHours() * 60 + endTime.getMinutes();

      // Build results for each track
      const results = [];
      for (const track of allTracks) {
        const increments = [];
        for (const slot of timeslots) {
          if (slot < startMinsRange || slot > endMinsRange) {
            continue;
          }
          // @ts-ignore
          const isReserved = reservedSlotsMap[track.id].has(slot);
          if (!isReserved) {
            const hh = String(Math.floor(slot / 60)).padStart(2, '0');
            const mm = String(slot % 60).padStart(2, '0');
            increments.push(`${hh}:${mm}`);
          }
        }

        results.push({
          // @ts-ignore
          id: track.id,
          // @ts-ignore
          name: track.name,
          // @ts-ignore
          availability: increments,
          // @ts-ignore
          venue: track.venue
          // @ts-ignore
            ? { id: track.venue.id, name: track.venue.name }
            : null,
        });
      }

      // Group results by venue
      const venueMap = new Map();
      for (const trackResult of results) {
        // @ts-ignore
        const { venue } = trackResult;
        if (!venue) continue;

        const venueId = venue.id;
        if (!venueMap.has(venueId)) {
          venueMap.set(venueId, {
            venueName: venue.name,
            venueId: venueId,
            trackResults: [],
          });
        }
        venueMap.get(venueId).trackResults.push(trackResult);
      }

      // Compute venue availability
      function unionOfTimes(arrayOfTimeArrays) {
        const combined = arrayOfTimeArrays.flat();
        const set = new Set(combined);
        return [...set].sort();
      }

      const finalVenues = [];
      for (const [venueId, venueInfo] of venueMap.entries()) {
        const { venueName, trackResults } = venueInfo;
        const allAvailabilityArrays = trackResults.map((tr) => tr.availability);
        const venueAvailability = unionOfTimes(allAvailabilityArrays);

        finalVenues.push({
          venue: venueName,
          venueAvailability,
          venueId,
          results: trackResults,
        });
      }

      ctx.send(finalVenues);
    } catch (err) {
      console.error('Error in getVenueAvailability:', err);
      ctx.badRequest('Something went wrong.');
    }
  },

  async createReserve(ctx) {
    try {
        const {
            date,
            start_time,
            end_time,
            owner,
            court,
            seller,
            type,
            products,
            coach,
            venue,
            duration,
        // @ts-ignore
        } = ctx.request.body.data;

        // Validate required fields
        if (!date || !start_time || !end_time || !owner || !court || !seller || !products || products.length === 0) {
            return ctx.badRequest('Missing required fields.');
        }

        // Ensure date, start_time, and end_time are in valid ISO format
        const parsedStartTime = parseISO(`${date}T${start_time}`);
        const parsedEndTime = parseISO(`${date}T${end_time}`);

        const reservationData = {
            date,
            start_time,
            end_time, // Include seconds and milliseconds
            status: 'upfront_payment',
            duration,
            owner,
            court,
            seller,
            type,
            products,
            coach,
            venue,
            publishedAt: new Date().toISOString(), // Ensure the reservation is published
        };

        const reservation = await strapi.entityService.create('api::reservation.reservation', {
            // @ts-ignore
            data: reservationData,
        });

        const reservationId = reservation.id;

        // Log the reservation creation
        const when = formatSpanishDate(new Date());
        const existingReservationLog = await strapi.entityService.findMany('api::log-entry.log-entry', {
          filters: {
            action: 'reservation.created',
            reservation: { id: { $eq: reservationId } },
          },
          limit: 1,
        });
        
        if (existingReservationLog.length === 0) {
          await strapi.entityService.create('api::log-entry.log-entry', {
            data: {
              action: 'reservation.created',
              description: `Reserva #${reservationId} creada por el usuario ${seller} para el cliente ${owner} el ${when}`,
              timestamp: new Date(),
              user: owner,
              reservation: reservationId,
            },
          });
          console.log(`Log entry created for reservation.created: Reservation #${reservationId}`);
        } else {
          console.log(`Log entry for reservation.created already exists for Reservation #${reservationId}. Skipping.`);
        }

        // Check if a transaction already exists for this reservation
        const existingTransaction = await strapi.entityService.findMany('api::transaction.transaction', {
          filters: {
            reservation: {
              id: { $eq: reservationId }
            }
          }})
          ;

        if (existingTransaction && existingTransaction.length > 0) {
            strapi.log.info(`Transaction already exists for reservation #${reservationId}. Skipping transaction creation.`);
            return ctx.send({ reservationId, transactionId: existingTransaction[0].id });
        }

        // Fetch product and court details
        const productId = products[0];
        const product = await strapi.entityService.findOne('api::product.product', productId, {
            populate: {
                custom_price: { populate: ['venue'] },
                venues: true,
            },
        });

        if (!product) {
            throw new Error(`No se pudo encontrar el producto con ID: ${productId}`);
        }

        const courtDetails = await strapi.entityService.findOne('api::track.track', court, {
            populate: ['venue'],
        });

        if (!courtDetails || !courtDetails.venue) {
            throw new Error('No se pudo encontrar la sede (venue) asociada a la cancha de la reserva.');
        }

        const venueId = courtDetails.venue.id;

        // Determine the price
        let amount = product.price;
        const customPrice = product.custom_price.find(
            (price) => price.venue?.id === venueId && price.custom_ammount
        );

        if (customPrice) {
            amount = customPrice.custom_ammount;
        }

        // Create the transaction
        const transactionDate = `${date}T${start_time}`;
        const transactionDetails = {
            reservation: reservationId,
            client: owner,
            seller,
            amount,
            description: `Venta asociada a la reserva ${reservationId}`,
            date: transactionDate,
            status: 'Pending',
            source: 'sparring-club',
            products: [productId],
            venue: venueId,
        };

        const transaction = await strapi.service('api::transaction.transaction').create({
            data: transactionDetails,
        });

        const transactionId = transaction.id;

        // Log the transaction creation
        await strapi.entityService.create('api::log-entry.log-entry', {
            data: {
                action: 'transaction.created',
                description: `Transaction #${transactionId} creada para la reserva #${reservationId}, por un total de ${amount} el ${when}`,
                timestamp: new Date(),
                user: owner,
                reservation: reservationId,
                transaction: transactionId,
            },
        });

        // Return reservationId and transactionId
        return ctx.send({ reservationId, transactionId });
    } catch (error) {
        strapi.log.error('Error in Reserve controller:', error);
        return ctx.internalServerError('Failed to create reservation and transaction.');
    }
},
  
}));