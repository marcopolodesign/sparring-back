'use strict';
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
// Configura tus credenciales de acceso
const client = new MercadoPagoConfig({
  accessToken: 
  'APP_USR-2821647204953835-050222-f89cb3070828b637eec973ac9a34935a-2417659485',
  // 'TEST-6544869231828138-112018-0c1a68f0042f127d3b6e69c6bed72455-18820842',
});

module.exports = {
  async createPreference(ctx) {
    console.log("MercadoPago initialized");

    console.log(ctx.request.body, "ctx.request.body");

    // Crear un objeto de preferencia
    const preference = new Preference(client);

    try {
      const response = await preference.create({
        body: {
          items: ctx.request.body.items, // Populate items from ctx.request.body
          purpose: ctx.request.body.purpose, // Populate purpose from ctx.request.body
          back_urls: {
            success: "https://www.tu-sitio/success",
            failure: "http://www.tu-sitio/failure",
            pending: "http://www.tu-sitio/pending"
          },
          metadata: ctx.request.body.metadata, // Populate metadata from ctx.request.body
          auto_return: "approved",
        },
      });
      const preferenceId = response.id;
      console.log("preferenceId", preferenceId);
      ctx.send({ preferenceId });
    } catch (error) {
      console.log("Error creating preference", error);
      ctx.throw(500, "An error occurred while creating the payment preference");
    }
  },

  async webhook(ctx) {
    try {
      const paymentId = ctx.request.body?.data?.id;
      console.log("Received payment ID:", paymentId);
      console.log("Request body:", ctx.request.body);

      if (!paymentId) {
        ctx.throw(400, "Payment ID is missing in the request body");
      }

      // Fetch payment details from MercadoPago
      const payment = await new Payment(client).get({ id: paymentId });
      console.log("Payment details fetched:", payment);

      if (payment.status === 'approved') {
        const reservationId = payment.metadata?.reservation_id;
        const transactionId = payment.metadata?.transaction_id;
        console.log("Strapi payer:", payment.metadata?.user_id);
        const upFront = payment.metadata?.is_upfront;

        if (upFront && reservationId) {
          // Update reservation status to 'upfront_payment'
          await strapi.entityService.update('api::reservation.reservation', reservationId, {
            data: {
              status: 'upfront_payment',
              notes: `Upfront payed: Mercado Pago Payment ID: ${paymentId}`,
            },
          });

          console.log(`Reservation #${reservationId} updated to 'upfront_payment' for Payment ID: ${paymentId}`);
        }

        // Create a new payment entry
        await strapi.entityService.create('api::payment.payment', {
          data: {
            payer: payment.metadata?.user_id || 1,
            transaction: transactionId || null,
            reservation: reservationId || null,
            status: payment.status,
            payment_method: payment.payment_type_id || 'unknown',
            amount: payment.transaction_amount,
            currency: payment.currency_id || 'unknown',
            external_id: paymentId,
            payer_email: payment.payer?.email || null,
            publishedAt: new Date().toISOString(), // Ensure the payment is published
          },
        });

        console.log(`Payment entry created for Payment ID: ${paymentId}`);

        if (transactionId) {
          // Fetch the transaction to update its details
          const transaction = await strapi.entityService.findOne('api::transaction.transaction', transactionId);

          if (transaction) {
            const updatedAmountPaid = (transaction.amount_paid || 0) + payment.transaction_amount;
            const isFullyPaid = updatedAmountPaid >= transaction.amount;

            // Update the transaction with the new payment details
            await strapi.entityService.update('api::transaction.transaction', transactionId, {
              data: {
                amount_paid: updatedAmountPaid,
                is_fully_paid: isFullyPaid,
                status: isFullyPaid ? 'Paid' : 'PartiallyPaid',
                payment_method: 'gateway-mp',
              },
            });

            console.log(`Transaction #${transactionId} updated: amount_paid=${updatedAmountPaid}, is_fully_paid=${isFullyPaid}`);
          } else {
            console.error(`Transaction #${transactionId} not found.`);
          }
        }

        if (reservationId) {
          // Update reservation status to 'confirmed'
          await strapi.entityService.update('api::reservation.reservation', reservationId, {
            data: { status: 'confirmed' },
          });

          console.log(`Reservation #${reservationId} status updated to 'confirmed'`);
        }
      }

      ctx.send({ received: true });
    } catch (error) {
      console.error("Error in webhook:", error);
      ctx.throw(500, error.message);
    }
  },
};

