'use strict';

module.exports = {
  async fetchRealtimeReservations(ctx) {
    console.log('Raw request params:', ctx.params); // Debugging log

    let { trackIds } = ctx.params;
    const { date } = ctx.query; // Use query for optional date

    // Ensure trackIds is an array
    if (trackIds) {
      trackIds = trackIds.split(','); // Split comma-separated values into an array
    } else {
      return ctx.badRequest('At least one Track ID is required');
    }

    try {
      const nowUTC = new Date();
      const now = new Date(nowUTC.getTime() - nowUTC.getTimezoneOffset() * 60000); // Adjust to local timezone
      const nowPlus20Minutes = new Date(now.getTime() + 20 * 60000); // Add 20 minutes to local time
      const targetDate = date || now.toISOString().split('T')[0]; // Use local date

      const processedReservations = [];
      // console.log('Target date for reservations:', targetDate);
      // console.log('Track IDs to process:', trackIds);
      // console.log('Current local date and time:', now);
      // console.log('Current local date and time + 20 minutes:', nowPlus20Minutes);

      // Fetch reservations for the specified date
      const reservations = await strapi.entityService.findMany('api::reservation.reservation', {
        filters: {
          date: { $eq: targetDate }, // Ensure date strictly equals targetDate
          court: { id: { $in: trackIds } }, // Use trackIds as track IDs
        },
        populate: {
          court: true,
          owner: { fields: ['firstName', 'lastName'] }, // Populate only firstName and lastName of owner
        },
      });

      // console.log('Fetched reservations:', reservations); // Debugging log

      // Process reservations to find the closest start_time for each track
      const trackClosestReservations = {};

      for (const reservation of reservations) {
        const trackId = reservation.court.id;

        // Combine date with start_time and end_time to create full DateTime objects
        const startTimeUTC = new Date(`${reservation.date}T${reservation.start_time}`);
        const endTimeUTC = new Date(`${reservation.date}T${reservation.end_time}`);

        // Convert to local timezone
        const startTime = new Date(startTimeUTC.getTime() - startTimeUTC.getTimezoneOffset() * 60000);
        const endTime = new Date(endTimeUTC.getTime() - endTimeUTC.getTimezoneOffset() * 60000);

        // console.log('Start time (local):', startTime); // Debugging log
        // console.log('End time (local):', endTime); // Debugging log

        // Check if the reservation is active within the range
        if (startTime <= nowPlus20Minutes && endTime >= now) {
          // Update the closest reservation for the track
          if (
            !trackClosestReservations[trackId] ||
            startTime < new Date(trackClosestReservations[trackId].start_time)
          ) {
            trackClosestReservations[trackId] = reservation;
          }
        }
      }

      // Add the closest reservation for each track to the processed results
      for (const trackId of Object.keys(trackClosestReservations)) {
        const closestReservation = trackClosestReservations[trackId];

        // Fetch associated products for the closest reservation
        const reservationTransactions = await strapi.entityService.findMany('api::transaction.transaction', {
          filters: {
            reservation: {
              id: closestReservation.id,
            },
          },
          populate: {
            products: {
              populate: {
                custom_price: { fields: ['custom_ammount'] },
              },
              fields: ['Name', 'type', 'price'],
            },
          },
        });

        // Format the products and calculate the total
        let total = 0;
        const formattedProducts = reservationTransactions.flatMap((transaction) => {
          const products = transaction.products || [];
          return products.map((product) => {
            const price = product.custom_price?.[0]?.custom_ammount || product.price;
            total += price; // Add to total
            return {
              id: product.id,
              name: product.Name,
              type: product.type,
              price,
              transactionStatus: transaction.status, // Include transaction status
            };
          });
        });

        processedReservations.push({
          trackId,
          trackName: closestReservation.court.name, // Include track name
          closestReservation: {
            id: closestReservation.id,
            type: closestReservation.type, // Include reservation type
            ownerName: `${closestReservation.owner?.firstName} ${closestReservation.owner?.lastName}`, // Include owner name
            startTime: closestReservation.start_time,
            endTime: closestReservation.end_time,
            products: formattedProducts, // Include associated products
            total, // Include total
          },
        });
      }

      ctx.send(processedReservations);
    } catch (error) {
      console.error('Error fetching real-time reservations:', error);
      ctx.internalServerError('An error occurred while fetching reservations');
    }
  },

  async fetchMostRecentReservationByUser(ctx) {
    const { userId } = ctx.params;

    // Ensure userId is provided
    if (!userId) {
      return ctx.badRequest('User ID is required');
    }

    try {
      // Fetch the most recent reservation for the user
      const reservations = await strapi.entityService.findMany('api::reservation.reservation', {
        filters: {
          owner: { id: userId }, // Filter by userId
        },
        sort: { date: 'desc', start_time: 'desc' }, // Sort by date and start_time in descending order
        limit: 1, // Fetch only the most recent reservation
        populate: {
          court: true,
          owner: { fields: ['firstName', 'lastName'] }, // Populate only firstName and lastName of owner
        },
      });

      if (reservations.length === 0) {
        return ctx.notFound('No reservations found for the given user');
      }

      const mostRecentReservation = reservations[0];

      // Fetch associated products for the most recent reservation
      const reservationTransactions = await strapi.entityService.findMany('api::transaction.transaction', {
        filters: {
          reservation: {
            id: mostRecentReservation.id,
          },
        },
        populate: {
          products: {
            populate: {
              custom_price: { fields: ['custom_ammount'] },
            },
            fields: ['Name', 'type', 'price'],
          },
        },
      });

      // Format the products and calculate the total
      let total = 0;
      const formattedProducts = reservationTransactions.flatMap((transaction) => {
        const products = transaction.products || [];
        return products.map((product) => {
          const price = product.custom_price?.[0]?.custom_ammount || product.price;
          total += price; // Add to total
          return {
            id: product.id,
            name: product.Name,
            type: product.type,
            price,
            transactionStatus: transaction.status, // Include transaction status
          };
        });
      });

      // Prepare the response
      const response = {
        reservation: {
          id: mostRecentReservation.id,
          type: mostRecentReservation.type, // Include reservation type
          ownerName: `${mostRecentReservation.owner?.firstName} ${mostRecentReservation.owner?.lastName}`, // Include owner name
          date: mostRecentReservation.date,
          startTime: mostRecentReservation.start_time,
          endTime: mostRecentReservation.end_time,
          court: {
            id: mostRecentReservation.court.id,
            name: mostRecentReservation.court.name, // Include track name
          },
        },
        products: formattedProducts,
        total, // Include total
      };

      ctx.send(response);
    } catch (error) {
      console.error('Error fetching the most recent reservation by user:', error);
      ctx.internalServerError('An error occurred while fetching the reservation');
    }
  },
};
