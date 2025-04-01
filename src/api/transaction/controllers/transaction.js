'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::transaction.transaction', ({ strapi }) => ({
  async update(ctx) {
    // ✅ 1. Run default update behavior (this includes data sanitization, permissions, etc.)
    const response = await super.update(ctx);

    try {

        const body = ctx.request?.body || {};
            // @ts-ignore
        const status = body?.data?.status;
            // @ts-ignore
        const paymentMethod = body?.data?.payment_method;
  
        const transactionId = ctx.params.id;


      // ✅ 2. Get the updated status from the request
    // @ts-ignore
    const updatedStatus = ctx.request?.body?.data?.status;  
      
      
    if (status || paymentMethod) {
        // ✅ Fetch transaction with reservation relation
        const transaction = await strapi.entityService.findOne('api::transaction.transaction', transactionId, {
          populate: ['reservation'],
        });

        const reservationId = transaction?.reservation?.id;

        if (reservationId) {
          // ✅ Determine what to do based on new status
          if (['Cancelled', 'Refunded'].includes(status)) {
            await strapi.entityService.update('api::reservation.reservation', reservationId, {
              data: { status: 'cancelled' },
            });
            strapi.log.info(`Reservation ${reservationId} cancelled due to transaction ${status}`);
          }

          // ✅ NEW: if transaction is paid, confirm the reservation
          if (status === 'Completed') {
            await strapi.entityService.update('api::reservation.reservation', reservationId, {
              data: { status: 'confirmed' },
            });
            strapi.log.info(`Reservation ${reservationId} confirmed due to payment via ${paymentMethod}`);
          }
        }
      }
    } catch (error) {
      strapi.log.error('Error syncing reservation with transaction update:', error);
    }

    // ✅ 5. Return the original update response
    return response;
  },
}));