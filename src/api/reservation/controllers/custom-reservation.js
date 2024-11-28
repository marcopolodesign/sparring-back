'use strict';
const qs = require('qs');


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
}));