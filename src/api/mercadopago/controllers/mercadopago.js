'use strict';
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
// Configura tus credenciales de acceso
const client = new MercadoPagoConfig({
  accessToken: 'TEST-6544869231828138-112018-0c1a68f0042f127d3b6e69c6bed72455-18820842',
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
      const paymentId = ctx.request.body.data.id;
      console.log("ctx.query", ctx.query);
      console.log("ctx.request.body", ctx.request.body);

      const payment = new Payment(client);

      payment.search().then(console.log).catch(console.log);

      // const { status, metadata } = payment.;
      // const reservationId = metadata.reservation_id;

      // if (status === 'approved') {
      //   // Update reservation status
      //   await strapi.entityService.update('api::reservation.reservation', reservationId, {
      //     data: { status: 'confirmed' },
      //   });

      //   // Optionally, create a transaction record
      //   await strapi.entityService.create('api::transaction.transaction', {
      //     data: {
      //       // amount: payment.transaction_amount,
      //       status,
      //       reservation: reservationId,
      //     },
      //   });
      // }

      // ctx.send({ received: true });
    } catch (error) {
      ctx.throw(500, error.message);
    }
  },

  
};

