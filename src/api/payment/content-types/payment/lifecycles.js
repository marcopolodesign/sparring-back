'use strict';

module.exports = {
    async beforeCreate(event) {
        const { data } = event.params;

        // 1) Si no vino transaction, no hacemos nada
        if (!data.transaction) {
            strapi.log.warn(`Payment sin transaction: saltando beforeCreate`);
            return;
        }

        // 2) Traemos la transacción + reserva + venue
        const txn = await strapi.entityService.findOne(
            'api::transaction.transaction',
            data.transaction,
            {
                populate: {
                    reservation: {
                        populate: ['venue']
                    }
                }
            }
        );

        if (!txn || !txn.reservation) {
            strapi.log.warn(
                `beforeCreate Payment: transacción/reserva no encontrada (${data.transaction})`
            );
            return;
        }

        const venue = txn.reservation.venue;
        if (!venue) {
            strapi.log.warn(
                `beforeCreate Payment: venue no asociada a reserva ${txn.reservation.id}`
            );
            return;
        }

        // 3) Leemos el porcentaje de descuento del venue
        const pct = Number(venue.cash_discount_percent) || 0;

        // 4) Montos base
        const raw = Number(data.amount) || 0; // lo que ingresó el usuario

        // 5) Si es efectivo y hay pct > 0, aplicamos descuento dinámico
        if (
            data.payment_method?.toLowerCase() === 'efectivo' &&
            pct > 0
        ) {
            const discountAmt = raw * pct / 100; // ej: 25 000 * 0.10 = 2 500
            const netAmount = raw - discountAmt; // ej: 25 000 - 2 500 = 22 500

            data.discount_percent = pct;
            data.discount_amount = discountAmt;
            data.net_amount = netAmount; // lo que realmente entró en caja
        } else {
            // 6) Cualquier otro caso, sin descuento
            data.discount_percent = 0;
            data.discount_amount = 0;
            data.net_amount = raw;
        }
    },

    async afterCreate(event) {
        const { result, params } = event;

        try {
            const transactionId = params.data.transaction;
            if (!transactionId) {
                strapi.log.warn(`Payment #${result.id} does not have an associated transaction.`);
                return;
            }

            console.log(`Processing Payment #${result.id} for Transaction #${transactionId} in PAYMENT LIFECYCLE`);
            // console.log(`Payment details:`, result);
            // console.log('full payment details:', params.data);
            console.log('full event', event);
            // 1) Traemos la transacción
            const transaction = await strapi.entityService.findOne(
                'api::transaction.transaction',
                transactionId
            );
            if (!transaction) {
                throw new Error(`Transaction #${transactionId} not found for Payment #${result.id}`);
            }

            // 2) Determinamos el monto a sumar al total pagado
            const isCash = result.payment_method?.toLowerCase() === 'efectivo';
            const amountToAdd = isCash
                ? Number(result.net_amount) || 0 // Use net_amount if efectivo
                : Number(result.amount) || 0;   // Use amount otherwise

            const disc = Number(result.discount_amount) || 0;

            // 3) Sumamos al total previo
            const prevPaid = Number(transaction.amount_paid) || 0;
            const prevDiscounts = Number(transaction.discount) || 0;

            const newPaid = prevPaid + amountToAdd;
            const newDiscountTotal = prevDiscounts + disc;

            // 4) Verificamos si la transacción está completamente pagada
            const totalTransactionAmount = Number(transaction.amount) || 0;
            const isFullyPaid = (newPaid + newDiscountTotal) === totalTransactionAmount;

            // 5) Actualizamos la transacción
            let updatedPaymentMethod = result.isPaymentGateway ? 'gateway-mp' : result.payment_method.toLowerCase();

            // Check if the existing payment_method differs from the new one
            if (transaction.payment_method && transaction.payment_method !== updatedPaymentMethod) {
                updatedPaymentMethod = 'multiple';
            }

            await strapi.entityService.update(
                'api::transaction.transaction',
                transactionId,
                {
                    data: {
                        amount_paid: newPaid,
                        discount: newDiscountTotal,
                        is_fully_paid: isFullyPaid,
                        status: isFullyPaid ? 'Paid' : 'PartiallyPaid',
                        payment_method: updatedPaymentMethod, // Use the updated payment method
                    },
                }
            );

            strapi.log.info(
                `Txn #${transactionId} updated: amount_paid=${newPaid}, ` +
                `discounts=${newDiscountTotal}, paid=${isFullyPaid}, ` +
                `payment_method=${updatedPaymentMethod}`
            );

            // 6) Creamos tu log-entry como antes
            const when = new Date().toLocaleString('es-AR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            await strapi.entityService.create('api::log-entry.log-entry', {
                data: {
                    action: 'payment.created',
                    description:
                        `Payment #${result.id}: neto ARS ${amountToAdd}, ` +
                        `descuento ARS ${disc}, aplicado a Txn #${transactionId} el ${when}. ` +
                        `Status: ${isFullyPaid ? 'Paid' : 'PartiallyPaid'}`,
                    timestamp: new Date(),
                    user: params.data.payer || null,
                    transaction: transactionId,
                    payment: result.id,
                },
            });

        } catch (error) {
            strapi.log.error(`Error processing Payment #${result.id}:`, error);
        }
    },
};
