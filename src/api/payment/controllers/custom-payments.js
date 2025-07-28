'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::payment.payment', ({ strapi }) => ({

  /**
   * Custom endpoint to perform a charge back on a payment.
   * POST /custom-payment/chargeback/:paymentId
   */
  async chargeback(ctx) {
    const paymentId = ctx.params.paymentId;
    const userId = ctx.state.user?.id || null;

    // Fetch the original payment
    const originalPayment = await strapi.entityService.findOne('api::payment.payment', paymentId, {
      populate: ['transaction', 'reservation', 'payer', 'cash_register'],
    });

    if (!originalPayment) {
      return ctx.badRequest('Original payment not found.');
    }

    if (originalPayment.status === 'charged_back') {
      return ctx.badRequest('This payment has already been charged back.');
    }

    // Mimic original payment method and cash_register if efectivo
    const negativePaymentData = {
      amount: -Math.abs(originalPayment.amount),
      net_amount: -Math.abs(originalPayment.net_amount),
      payment_method: originalPayment.payment_method,
      status: /** @type {"charged_back"} */ ('charged_back'),
      transaction: originalPayment.transaction?.id,
      reservation: originalPayment.reservation?.id,
      payer: originalPayment.payer?.id,
      chargeback_of: originalPayment.id, // Make sure this field exists in your model
      publishedAt: new Date().toISOString(),
    };

    if (originalPayment.payment_method === 'efectivo' && originalPayment.cash_register) {
      negativePaymentData.cash_register = originalPayment.cash_register.id;
    }

    // Create the negative payment (charge back)
    const negativePayment = await strapi.entityService.create('api::payment.payment', {
      data: negativePaymentData,
    });

    // Optionally mark the original payment as charged_back
    await strapi.entityService.update('api::payment.payment', originalPayment.id, {
      data: { status: 'charged_back' },
    });

    // Recalculate transaction's amount_paid and status
    const payments = await strapi.entityService.findMany('api::payment.payment', {
      filters: { transaction: { id: originalPayment.transaction?.id } },
    });
    const totalPaid = payments
      .filter(p => ['approved', 'charged_back'].includes(p.status))
      .reduce((sum, p) => sum + Number(p.amount), 0);

    await strapi.entityService.update('api::transaction.transaction', originalPayment.transaction?.id, {
      data: {
        amount_paid: totalPaid,
        status: totalPaid <= 0 ? 'Pending' : 'PartiallyPaid',
      },
    });

    // Log the charge back
    await strapi.entityService.create('api::log-entry.log-entry', {
      data: {
        action: 'payment.charge_back',
        description: `Charge back: Payment #${originalPayment.id} reversed by Payment #${negativePayment.id}`,
        timestamp: new Date(),
        user: userId,
        reservation: originalPayment.reservation?.id,
        transaction: originalPayment.transaction?.id,
        payment: negativePayment.id,
      },
    });

    ctx.send({
      message: 'Charge back processed successfully.',
      negativePayment,
    });
  },

}));