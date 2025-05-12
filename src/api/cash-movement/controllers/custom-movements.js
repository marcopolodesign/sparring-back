'use strict';


module.exports = {
  async findCustomMovements(ctx) {
    console.log('testin')
    const { cash_register_id } = ctx.query;

    console.log(cash_register_id, 'REGISTER')
    
    if (!cash_register_id) {
      return ctx.badRequest('cash_register_id is required');
    }

    // Fetch payments made in 'efectivo'
    const payments = /** @type {Array<{ createdAt: string, id: number, seller: string, payer?: { firstName?: string, lastName?: string }, transaction?: { products?: { Name?: string } }, net_amount: number }>} */ (
      await strapi.entityService.findMany('api::payment.payment', {
        filters: {
          $or: [
            { payment_method: { $eqi: 'efectivo' } },
            { isPaidInCash: true },
          ],
          cash_register: {
            id: {
              $eq: cash_register_id, // Ensure proper equality check
            },
          },
        },
        populate: ['payer', 'transaction.products',],
      })
    );

    console.log(payments[0].transaction?.products[0], 'payments')

    // Fetch associated cash movements
    const cashMovements = await strapi.entityService.findMany('api::cash-movement.cash-movement', {
      filters: {
        cash_register: {
          id: {
            $eq: cash_register_id, // Correct deep filtering for the relation
          },
        },
      },
      populate: {
        seller: { fields: ['username', 'email', 'firstName', 'lastName'] }, // Populate seller details
        cash_register: { fields: ['opened_at', 'opening_balance', 'status', 'closing_balance', 'closing_notes'] }, // Populate cash_register details
      },
    });

    console.log(cashMovements, 'cashMovements')

    // Format the results
    const formattedResults = [
      ...payments.map(payment => ({
        Fecha: payment.createdAt,
        ID: payment.id,
        Tipo: 'Pago',
        Vendedor: payment.seller || '',
        Cliente: `${payment.payer?.firstName || ''} ${payment.payer?.lastName || ''}`.trim(),
        Descripción: payment.transaction?.products[0]?.Name || '',
        Total: payment.net_amount,
      })),
      ...cashMovements.map(movement => ({
        Fecha: movement.createdAt,
        ID: movement.id,
        Tipo: movement.type === 'addition' ? 'Agrego Efectivo' : 'Sacado Efectivo',
        Vendedor: movement.seller?.firstName + ' ' + movement.seller?.lastName || '',
        Cliente: '-',
        Descripción: movement.description || '',
        Total: movement.amount,
      })),
    ];

    return formattedResults;
  },
};
