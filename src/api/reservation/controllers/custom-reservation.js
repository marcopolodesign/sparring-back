'use strict';
// @ts-ignore
// @ts-ignore
const qs = require('qs');
// @ts-ignore
// @ts-ignore
const { parseISO, addMinutes, subMinutes, format, differenceInMinutes, isBefore } = require('date-fns');

/**
 * reservation controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::reservation.reservation', ({ strapi }) => ({
  async createTransaction(ctx) {
    // Llamar al método base para crear la reserva
    const { data, meta } = await super.create(ctx);

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
      throw new Error('Error creando la venta asociada a la reserva.');
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

      // ----------------------------------------------------------------
      // 1) Resolve date/time
      // ----------------------------------------------------------------
      const noDate = !date || date === 'undefined' || date === ':date';
      const noTime = !time || time === 'undefined' || time === ':time';

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
        const allTracksInSystem = await strapi.entityService.findMany('api::track.track', {
          fields: ['id'],
        });
        // @ts-ignore
        trackIds = allTracksInSystem.map((t) => t.id);
      } else {
        trackIds = tracks.split(',').map((t) => parseInt(t, 10));
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
        console.log(product, 'PRODUCT')
        // @ts-ignore
        const customPrices = product.custom_price || [];

        // Filter valid custom prices:
        // Exclude prices with a null venue and keep only those where the venue name matches.
        const validCustomPrices = customPrices.filter((price) => {
          console.log(price, 'PRICE')

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
  
}));