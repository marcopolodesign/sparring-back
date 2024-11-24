'use strict';
const { MercadoPagoConfig, Preference } = require('mercadopago');
// Configura tus credenciales de acceso
const client = new MercadoPagoConfig({
  accessToken: 'TEST-6544869231828138-112018-0c1a68f0042f127d3b6e69c6bed72455-18820842',
});

module.exports = {
  async createPreference(ctx) {
    console.log("MercadoPago initialized");

    // Crear un objeto de preferencia
    const preference = new Preference(client);

    try {
      const response = await preference.create({
        body: {
          items: [
            {
              id: '123',
              title: 'My product',
              quantity: 1,
              unit_price: 2000, // item unit price
            },
          ],
          // Allow only logged payments. To allow guest payments you can omit this property
          purpose: 'wallet_purchase',
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
};

