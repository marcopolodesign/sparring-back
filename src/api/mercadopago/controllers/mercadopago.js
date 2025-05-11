'use strict';
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const axios = require('axios');

// Helper function to fetch payment details from MercadoPago API
async function fetchPaymentDetails(paymentId) {
  try {
    const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer APP_USR-2205444716214199-050710-cf00ce68154d7538b3261527affc17b4-170093860`, // Use the provided token
      },
    });
    return response.data; // Return the payment details
  } catch (error) {
    console.error(`Error fetching payment details for Payment ID ${paymentId}:`, error);
    throw new Error('Failed to fetch payment details from MercadoPago API.');
  }
}

// Configura tus credenciales de acceso

module.exports = {
  async createPreference(ctx) {
    try {
      const { venueId } = ctx.request.body.metadata; // Extract venueId from metadata
      if (!venueId) {
        ctx.throw(400, "Venue ID is required in metadata.");
      }

      // Fetch the venue to get the mp_access_token
      const venue = await strapi.entityService.findOne('api::court.court', venueId, {
        fields: ['mp_access_token'],
      });

      if (!venue || !venue.mp_access_token) {
        ctx.throw(400, "Venue does not have a valid MercadoPago access token.");
      }

      const client = new MercadoPagoConfig({
        accessToken: venue.mp_access_token, // Use the venue's access token
      });

      console.log("MercadoPago initialized for venue:", venueId);

      const preference = new Preference(client);

      // Fetch the latest payment to generate the external_reference
      const latestPayment = await strapi.entityService.findMany('api::payment.payment', {
        sort: { id: 'desc' },
        limit: 1,
      });

      const latestPaymentId = latestPayment.length > 0 ? latestPayment[0].id : 0;
      const externalReference = (Number(latestPaymentId) + 1).toString(); // Increment the latest payment ID

      const response = await preference.create({
        body: {
          items: ctx.request.body.items, // Populate items from ctx.request.body
          purpose: ctx.request.body.purpose, // Populate purpose from ctx.request.body
          back_urls: {
            success: "https://goldfish-app-25h3o.ondigitalocean.app/api/mercadopago/backmp",
            failure: `https://goldfish-app-25h3o.ondigitalocean.app/api/mercadopago/backmp`,
            pending: `https://goldfish-app-25h3o.ondigitalocean.app/api/mercadopago/backmp`,

            // success: "https://localhost:1337/api/mercadopago/backmp",
            // failure: "https://localhost:1337/api/mercadopago/backmp",
            // pending: "https://localhost:1337/api/mercadopago/backmp",
          },
          external_reference: externalReference, // Use the generated external_reference
          metadata: ctx.request.body.metadata, // Populate metadata from ctx.request.body
          auto_return: "approved",
        },
      });

      const preferenceId = response.id;
      console.log("Preference created:", preferenceId);
      ctx.send({ preferenceId });
    } catch (error) {
      console.error("Error creating preference:", error);
      ctx.throw(500, "An error occurred while creating the payment preference.");
    }
  },

  async webhook(ctx) {
    try {
      const paymentId = ctx.request.body?.data?.id;
      console.log("Received payment ID:", paymentId);

      if (!paymentId) {
        ctx.throw(400, "Payment ID is missing in the request body");
      }

      // Fetch payment details using the helper function
      const payment = await fetchPaymentDetails(paymentId);
      console.log("Payment details fetched:", payment);

      // Check if the payment has already been processed
      const existingPayment = await strapi.entityService.findMany('api::payment.payment', {
        filters: { external_id: paymentId.toString() },
        limit: 1,
      });

      if (existingPayment.length > 0) {
        console.log(`Payment ID ${paymentId} has already been processed. Skipping.`);
        return ctx.send({ received: true });
      }

      if (payment.status === 'approved') {
        const reservationId = payment.metadata?.reservation_id;
        const transactionId = payment.metadata?.transaction_id;
        console.log("Strapi payer:", payment.metadata?.user_id);
        const upFront = payment.metadata?.is_upfront;

        // Create a new payment entry
        const newPayment = await strapi.entityService.create('api::payment.payment', {
          data: {
            payer: payment.metadata?.user_id || 1,
            transaction: transactionId || null,
            reservation: reservationId || null,
            status: payment.status,
            payment_method: payment.payment_type_id || 'unknown',
            amount: payment.transaction_amount,
            currency: payment.currency_id || 'unknown',
            external_id: paymentId.toString(), // Ensure external_id is stored as a string
            payer_email: payment.payer?.email || null,
            publishedAt: new Date().toISOString(), // Ensure the payment is published
            isPaymentGateway: true,
          },
        });

        console.log(`Payment entry created for Payment ID: ${paymentId}`);

        // Log the payment creation -- ESTE ES EL QUE CREA
        const existingPaymentLog = await strapi.entityService.findMany('api::log-entry.log-entry', {
          filters: {
            action: 'payment.created',
            transaction: transactionId || null,
            reservation: reservationId || null,
          },
          limit: 1,
        });

        if (existingPaymentLog.length === 0) {
          await strapi.entityService.create('api::log-entry.log-entry', {
            data: {
              action: 'payment.created',
              description: `Payment #${newPayment.id} created for Reservation #${reservationId} and Transaction #${transactionId}, amount: ${payment.transaction_amount}`,
              timestamp: new Date(),
              user: payment.metadata?.user_id || null,
              reservation: reservationId || null,
              transaction: transactionId || null,
            },
          });
          console.log(`Log entry created for payment.created: Payment #${newPayment.id}`);
        } else {
          console.log(`Log entry for payment.created already exists for Payment #${newPayment.id}. Skipping.`);
        }

        if (transactionId) {
          // Fetch the transaction to update its details
          const transaction = await strapi.entityService.findOne('api::transaction.transaction', transactionId, {
            populate: { payments: true }, // Include associated payments
          });

          if (transaction) {
            // Check if the payment is already associated with the transaction
            const isPaymentAlreadyAssociated = transaction.payments?.some(
              (payment) => payment.external_id === paymentId.toString()
            );

            // ESTE NO LO CREA NI ACTUALIZA NADA EN LOCAL!
            if (isPaymentAlreadyAssociated) {
              console.log(`Payment ID ${paymentId} is already associated with Transaction #${transactionId}. Skipping update.`);
            } else {
              const updatedAmountPaid = (transaction.amount_paid || 0) + payment.transaction_amount;
              const isFullyPaid = updatedAmountPaid >= transaction.amount;

              // Update the transaction with the new payment details
              await strapi.entityService.update('api::transaction.transaction', transactionId, {
                data: {
                  amount_paid: updatedAmountPaid,
                  is_fully_paid: isFullyPaid,
                  status: isFullyPaid ? 'Paid' : 'PartiallyPaid',
                  payment_method: payment.payment_type_id && 'gateway-mp' || null, // Set payment method
                },
              });

              console.log(`Transaction #${transactionId} updated: amount_paid=${updatedAmountPaid}, is_fully_paid=${isFullyPaid}, payment_method=${payment.payment_type_id || 'gateway-mp'}`);
            }
          } else {
            console.error(`Transaction #${transactionId} not found.`);
          }
        }

        if (reservationId) {
          // Fetch the current reservation to check its status
          const currentReservation = await strapi.entityService.findOne('api::reservation.reservation', reservationId, {
            fields: ['status', 'notes'], // Fetch only the necessary fields
          });

          // Determine the appropriate status for the reservation
          const newStatus = upFront ? 'upfront_payment' : 'confirmed';
          const newNotes = upFront ? `Upfront payed: Mercado Pago Payment ID: ${paymentId}` : null;

          // Update the reservation only if the status or notes need to change
          if (currentReservation.status !== newStatus || currentReservation.notes !== newNotes) {
            const reservationUpdateData = {
              status: newStatus,
            };

            if (newNotes) {
              reservationUpdateData.notes = newNotes;
            }

            await strapi.entityService.update('api::reservation.reservation', reservationId, {
              data: {
                status: newStatus,
                ...(newNotes && { notes: newNotes }),
              },
            });

            console.log(`Reservation #${reservationId} updated to '${newStatus}' for Payment ID: ${paymentId}`);
          } else {
            console.log(`Reservation #${reservationId} already has status '${currentReservation.status}'. Skipping update.`);
          }
        }
      }

      ctx.send({ received: true });
    } catch (error) {
      console.error("Error in webhook:", error);
      ctx.throw(500, error.message);
    }
  },

  async backmp(ctx) {
    try {
      const { payment_id } = ctx.query; // Extract payment_id from query
      if (!payment_id || payment_id === "null") {
        ctx.redirect(
          `https://club.sparring.com.ar/reserva-fallida`
        );
      }

      // Fetch payment details using the helper function
      const payment = await fetchPaymentDetails(payment_id);
      console.log("Payment details fetched:", payment);

      // Redirect using data from the payment response
      ctx.redirect(
        `https://club.sparring.com.ar/${payment.metadata?.venue_name || 'sparring'}/reserva-confirmada?payment_id=${payment.id}&status=${payment.status}&total_amount=${payment.transaction_amount}&reservation_id=${payment.metadata?.reservation_id}&transaction_id=${payment.metadata?.transaction_id}&user_id=${payment.metadata?.user_id}`
      );
    } catch (error) {
      console.error("Error in backmp:", error);
      ctx.throw(500, "An error occurred while processing the payment.");
    }
  },
};



// const client = new MercadoPagoConfig({
//   accessToken: 
//   'APP_USR-6544869231828138-112018-25ed818d64688444790c43b47d73ff0e-18820842', -- prod token mateo
//   // 'APP_USR-2205444716214199-050710-cf00ce68154d7538b3261527affc17b4-170093860' -- prod token Emi
//   // 'APP_USR-362985557512186-050607-70bfddad69ce6a39e3d3a64f2c7d9706-2422687163', // -- test token prod
//   // 'TEST-6544869231828138-112018-0c1a68f0042f127d3b6e69c6bed72455-18820842', -- test token mateo
// });