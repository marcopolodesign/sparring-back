'use strict';
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

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

      const response = await preference.create({
        body: {
          items: ctx.request.body.items,
          purpose: ctx.request.body.purpose,
          back_urls: {
            success: `${process.env.PUBLIC_URL}/api/mercadopago/backmp`,
            failure: `${process.env.PUBLIC_URL}/api/mercadopago/backmp`,
            pending: `${process.env.PUBLIC_URL}/api/mercadopago/backmp`,
          },
          metadata: ctx.request.body.metadata,
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

      const paymentId = ctx.request.body?.data?.id;
      if (!paymentId) {
        ctx.throw(400, "Payment ID is missing in the request body.");
      }

      const payment = await new Payment(client).get({ id: paymentId });
      console.log("Payment details fetched:", payment);

      // Check if the payment has already been processed
      const existingPayment = await strapi.entityService.findMany('api::payment.payment', {
        filters: { external_id: paymentId.toString() }, // Ensure paymentId is treated as a string
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
      const { venueId } = ctx.query; // Extract venueId from query
      if (!venueId) {
        ctx.throw(400, "Venue ID is required in query.");
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

      const paymentId = ctx.query.payment_id;
      if (paymentId !== "null") {
        const payment = await new Payment(client).get({ id: paymentId });
        console.log("Payment details fetched:", payment);

        ctx.redirect(
          `${process.env.SPARRING_CLUB_URL}/${payment.metadata?.venue_name || 'sparring'}/reserva-confirmada?payment_id=${ctx.query.payment_id}&status=${ctx.query.status}&total_amount=${payment.transaction_amount}&reservation_id=${payment.metadata?.reservation_id}&transaction_id=${payment.metadata?.transaction_id}&user_id=${payment.metadata?.user_id}`
        );
      }
    } catch (error) {
      console.error("Error in backmp:", error);
      ctx.throw(500, error.message);
    }
  },
};

