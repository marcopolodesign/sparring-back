'use strict';

/**
 * A set of functions called "actions" for `reports`
 */

module.exports = {
  async getSalesByVenue(ctx) {
    const { venueId, startDate, endDate } = ctx.query;

    try {
      // Validate that a venue ID is provided
      if (!venueId) {
        return ctx.badRequest('Venue ID is required');
      }

      // Set default date range to the current month if not provided
      const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const end = endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59).toISOString();

      // Fetch reservations linked to the specified venue's tracks within the date range
      const reservations = await strapi.entityService.findMany('api::reservation.reservation', {
        filters: {
          court: {
            venue: {
              id: {
                $eq: venueId,
              },
            },
          },
          date: {
            $gte: start,
            $lte: end,
          },
          status: {
            $eq: 'confirmed', // Only include confirmed reservations
          }
        },
   
          populate: {
            transactions: {
              populate: {
                client: { fields: ['firstName', 'lastName'] },
                seller: { fields: ['firstName', 'lastName'] },
                products: { fields: ['Name', 'type', 'price'] },
              },
            },
          },
      });

      // Calculate the total number of transactions and their combined amount
      let totalAmount = 0;
      let transactionCount = 0;

      reservations.forEach(reservation => {
        if (reservation.transactions?.length) {
          reservation.transactions.forEach(transaction => {
            totalAmount += transaction.amount || 0;
            transactionCount++;
          });
        }
      });

      // Send the response with the total amount and the count of transactions
      ctx.send({
        totalAmount: `$${totalAmount.toLocaleString()}`, // Formatted with commas
        transactionCount,
      });
    } catch (error) {
      console.error('Error fetching transaction summary:', error);
      ctx.throw(500, 'Internal Server Error');
    }
  },

  async getDailySales(ctx) {
    const { venueId } = ctx.query;

    try {
      // Validate that a venue ID is provided
      if (!venueId) {
        return ctx.badRequest('Venue ID is required');
      }

      // Set the date range for the current day
      const start = new Date().setHours(0, 0, 0, 0); // Start of the day
      const end = new Date().setHours(23, 59, 59, 999); // End of the day

      // Fetch reservations linked to the specified venue's tracks for the current day
      const reservations = await strapi.entityService.findMany('api::reservation.reservation', {
        filters: {
          court: {
            venue: {
              id: {
                $eq: venueId,
              },
            },
          },
          date: {
            $gte: new Date(start).toISOString(),
            $lte: new Date(end).toISOString(),
          },
          status: {
            $eq: 'confirmed', // Only include confirmed reservations
          }
        },
        populate: {
          transactions: {
            populate: '*',
          },
        },
      });

      // Calculate the total amount of transactions for the day
      let totalAmount = 0;
      reservations.forEach(reservation => {
        if (reservation.transactions?.length) {
          reservation.transactions.forEach(transaction => {
            totalAmount += transaction.amount || 0;
          });
        }
      });

      // Send the response with the total amount for the day
      ctx.send({
        totalAmount: `$${totalAmount.toLocaleString()}`, // Formatted with commas
      });
    } catch (error) {
      console.error('Error fetching daily transactions:', error);
      ctx.throw(500, 'Internal Server Error');
    }
  },
};
