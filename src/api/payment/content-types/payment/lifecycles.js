'use strict';

module.exports = {
    async beforeCreate(event) {
        const { data } = event.params;
    
        console.log('Payment beforeCreate event:', event);
    
        // 1) Ensure a transaction is provided
        if (!data.transaction) {
          strapi.log.warn(`Payment without transaction: skipping beforeCreate`);
          return;
        }
    
        // 2) Load the transaction + reservation + venue
        const txn = await strapi.entityService.findOne(
            'api::transaction.transaction',
            data.transaction,
            {
                populate: {
                    products: true, // Populate products to access their type
                    reservation: {
                        populate: ['venue']
                    }
                }
            }
        );

        console.log('Transaction details:', txn);

        if (!txn?.reservation?.venue) {
          strapi.log.warn(
            `beforeCreate Payment: transaction or venue not found (${data.transaction})`
          );
          return;
        }
        const venueId = txn.reservation.venue.id;
        console.log('Venue ID payment lifecycle:', venueId);
    
        // 3) Find an open cash register for that venue
        const openCashRegister = await strapi.db
        .query('api::cash-register.cash-register')
        .findOne({
          where: {
            status: 'open',
            venue: venueId,
          },
        });

        console.log('Open cash register payment beforecreate lifecycle:', openCashRegister);
        if (!openCashRegister) {
          strapi.log.warn(
            `No open cash register found for venue ${venueId}: payment will not be associated`
          );
        } else {
          data.cash_register = openCashRegister.id;
        }
    
        // 4) Read the venue’s cash discount percent
        const pct = Number(txn.reservation.venue.cash_discount_percent) || 0;
        const scope = txn.reservation.venue.cash_discount_scope || 'none';
        const isCash = data.payment_method?.toLowerCase() === 'efectivo';

        console.log('Cash discount percent:', pct);
        console.log('Cash discount scope:', scope);
        console.log('Is cash payment:', isCash);



    // 5) Determine the type of product from the transaction
    const productType = txn.products?.[0]?.type || 'unknown'; // Default to 'unknown' if no product is found
    console.log('Product type:', productType);

    // 6) Base amounts
    const raw = Number(data.amount) || 0; // what the user entered

    let eligible = false;

    if (isCash && pct > 0) {
        switch (scope) {
            case 'both':
                eligible = true;
                break;
            case 'alquiler':
                eligible = productType === 'alquiler' 
                break;
            case 'producto':
                eligible = productType === 'producto'
                break;
            // 'none' -> false
        }
    }

    console.log('Is eligible for discount:', eligible);

    if (eligible) {
    const discountAmt = (raw * pct) / 100;
    const netAmount   = raw - discountAmt;

    data.discount_percent = pct;
    data.discount_amount  = discountAmt;
    data.net_amount       = netAmount;
    } else {
    data.discount_percent = 0;
    data.discount_amount  = 0;
    data.net_amount       = raw;
    }
      },

    async afterCreate(event) {
        const { result, params } = event;


         // ——————————————
        // Decrement stock for "producto" on approved payments
        const transactionId = params.data.transaction;
        console.log(`Transaction ID: ${transactionId}`);
        if (transactionId && result.status === 'approved') {
            console.log(`Decrementing stock for transaction ID: ${transactionId}`);
            try {
                const txn = await strapi.entityService.findOne(
                    'api::transaction.transaction',
                    transactionId,
                    {
                        populate: {
                            products: { populate: { custom_stock: { populate: ['venue'] } } },
                            reservation: { populate: ['venue'] },
                        },
                    }
                );
                console.log(`Transaction details:`, txn);
                const venueId = txn.reservation?.venue?.id;
                for (const prod of txn.products || []) {
                    console.log(`Product details:`, prod);
                    if (prod.type === 'producto') {
                        const stockRec = (prod.custom_stock || []).find(s => s.venue?.id === venueId);
                        if (stockRec) {
                            await strapi.db.query('api::client-custom-stock.client-custom-stock').update({
                                where: { id: stockRec.id },
                                data: { amount: stockRec.amount - 1 },
                            });
                        }
                    }
                }
            } catch (err) {
                strapi.log.error('Error adjusting stock after payment create:', err);
            }
        }

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
                transactionId,
                {
                    populate: ['reservation'] // Ensure reservation is populated
                }
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
                        `Pago #${result.id}: neto ARS ${amountToAdd}, ` +
                        `descuento ARS ${disc}, aplicado a transacción #${transactionId} el ${when}. ` +
                        `estado: ${isFullyPaid ? 'Pagado' : 'Pago parcial'}`,
                    timestamp: new Date(),
                    user: params.data.payer || null,
                    transaction: transactionId,
                    payment: result.id,
                },
            });


            const reservationId = transaction.reservation?.id;
            if (reservationId) {
                await strapi.entityService.update(
                    'api::reservation.reservation',
                    reservationId,
                    {
                        data: {
                            status: 'confirmed',
                        },
                    }
                );
    
                strapi.log.info(`Reservation #${reservationId} marked as confirmed for Transaction #${transactionId}`);
    
                await strapi.entityService.create('api::log-entry.log-entry', {
                    data: {
                        action: 'reservation.confirmed',
                        description: `Reserva #${reservationId} confirmada con el pago #${result.id} realizado el ${when}.`,
                        timestamp: new Date(),
                        user: params.data.payer || null,
                        transaction: transactionId,
                        reservation: reservationId,
                    },
                });
    
                strapi.log.info(`Log entry created for Reservation #${reservationId} confirmation.`);
            } else {
                strapi.log.warn(`Transaction #${transactionId} does not have an associated reservation.`);
            }
            

        } catch (error) {
            strapi.log.error(`Error processing Payment #${result.id}:`, error);
        }

       
    },

    async afterUpdate(event) {
        const { result: payment, params } = event;
        // on refund restore stock
        console.log('afterUpdate payment', payment);
        console.log('afterUpdate params', params);
        console.log('afterUpdate payment status', event);
        if (params.data.status === 'refunded') {
            try {
                // re-load payment to get the transaction relation
                const paid = await strapi.entityService.findOne(
                    'api::payment.payment',
                    payment.id,
                    { populate: ['transaction'] }
                );
                const transactionId = paid.transaction?.id;
                if (!transactionId) return;
                const txn = await strapi.entityService.findOne(
                    'api::transaction.transaction',
                    transactionId,
                    {
                        populate: {
                            products: { populate: { custom_stock: { populate: ['venue'] } } },
                            reservation: { populate: ['venue'] },
                        },
                    }
                );
                const venueId = txn.reservation?.venue?.id;
                for (const prod of txn.products || []) {
                    if (prod.type === 'producto') {
                        const stockRec = (prod.custom_stock || []).find(s => s.venue?.id === venueId);
                        if (stockRec) {
                            // restore one unit via entityService
                            await strapi.entityService.update(
                                'api::client-custom-stock.client-custom-stock',
                                stockRec.id,
                                { data: { amount: stockRec.amount + 1 } }
                            );
                        }
                    }
                }
            } catch (err) {
                strapi.log.error('Error restoring stock after refund:', err);
            }
        }
    },
};
