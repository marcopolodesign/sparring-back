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
            totalAmount += transaction.amount_paid || 0;
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
            totalAmount += transaction.amount_paid || 0;
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

  async getDailyReservationSales(ctx) {
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
                },
                // upfront_payment: {
                //     $eq: true, // Only include upfront payment reservations
                // },
            },
            populate: {
                transactions: {
                    populate: {
                        products: { fields: ['type', 'price'] }, // Populate product type
                    },
                },
            },
        });


        // Group transactions by date and reservation type
        const groupedSales = {};

        reservations.forEach(reservation => {
            const reservationDate = new Date(reservation.date).toISOString().split('T')[0]; // Extract the day
            const reservationType = reservation.type || 'unknown'; // Default to 'unknown' if type is missing

            console.log('reservation transactions:', reservation.transactions);

            if (!groupedSales[reservationDate]) {
                groupedSales[reservationDate] = {
                    day: reservationDate,
                    abono: 0,
                    abonoClase: 0,
                    clases: 0,
                    alquiler: 0,
                    productos: 0,
                };
            }

            if (reservation.transactions?.length) {
                reservation.transactions.forEach(transaction => {
                    if (['Paid', 'PartiallyPaid', 'Completed'].includes(transaction.status)) {
                        const amountPaid = transaction.amount_paid || 0;

                        console.log('transaction amount_paid:', amountPaid);

                        // Add the amount to the corresponding reservation type
                        switch (reservationType) {
                            case 'abono':
                                groupedSales[reservationDate].abono += amountPaid;
                                break;
                            case 'abonoClase':
                                groupedSales[reservationDate].abonoClase += amountPaid;
                                break;
                            case 'clase':
                                groupedSales[reservationDate].clases += amountPaid;
                                break;
                            case 'alquiler':
                                groupedSales[reservationDate].alquiler += amountPaid;
                                break;
                            default:
                                break; // Ignore unknown types
                        }

                        // Add the amount to productos if product.type exists
                        if (transaction.products?.length) {
                            transaction.products.forEach(product => {
                                if (product.type === 'producto') {
                                    groupedSales[reservationDate].productos += amountPaid;
                                }
                            });
                        }
                    }
                });
            }
        });

        // Convert groupedSales object to an array
        const salesArray = Object.values(groupedSales);

        salesArray.sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());


        // Send the response
        ctx.send(salesArray);
    } catch (error) {
        console.error('Error fetching daily reservation sales:', error);
        ctx.throw(500, 'Internal Server Error');
    }
},
};
