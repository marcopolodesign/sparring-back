'use strict';

module.exports = {
    async afterUpdate(event) {
        const { result, params } = event;

        try {
            const transactionId = result.id;
            const transactionStatus = result.status;
            const reservationId = result.reservation?.id;

            if (!reservationId) {
                strapi.log.warn(`Transaction #${transactionId} does not have an associated reservation. file: transaction/lifecycles.js`);
                return;
            }

            // Fetch the current reservation status
            const reservation = await strapi.entityService.findOne('api::reservation.reservation', reservationId, {
                fields: ['status'],
            });

            if (!reservation) {
                strapi.log.warn(`Reservation #${reservationId} not found for transaction #${transactionId}.`);
                return;
            }

            // Update reservation status based on transaction status
            if (transactionStatus === 'Paid') {
                // Confirm the reservation if not already confirmed
                if (reservation.status !== 'confirmed') {
                    await strapi.entityService.update('api::reservation.reservation', reservationId, {
                        data: { status: 'confirmed' },
                    });
                    strapi.log.info(`Reservation #${reservationId} marked as 'confirmed' due to transaction #${transactionId} being 'Paid'.`);
                }

                // Check if all transactions for the reservation are paid
                const allTransactions = await strapi.entityService.findMany('api::transaction.transaction', {
                    filters: { reservation: reservationId },
                    fields: ['status'],
                });

                const allPaid = allTransactions.every(txn => txn.status === 'Paid');
                if (allPaid) {
                    await strapi.entityService.update('api::reservation.reservation', reservationId, {
                        data: { status: 'paid' },
                    });
                    strapi.log.info(`Reservation #${reservationId} marked as 'paid' as all associated transactions are 'Paid'.`);
                }
            } else if (transactionStatus === 'PartiallyPaid' && reservation.status !== 'upfront_payment') {
                await strapi.entityService.update('api::reservation.reservation', reservationId, {
                    data: { status: 'confirmed' },
                });
                strapi.log.info(`Reservation #${reservationId} marked as "confirmed" due to transaction #${transactionId} being "PartiallyPaid".`);
            }
        } catch (error) {
            strapi.log.error(`Error updating reservation status for transaction #${result.id}:`, error);
        }
    },
};
