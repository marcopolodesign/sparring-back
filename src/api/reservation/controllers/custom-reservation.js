'use strict';

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
}));