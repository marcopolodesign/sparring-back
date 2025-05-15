'use strict';

const {
  addWeeks,
  format,
  parseISO,
  getDay,
  nextDay,
  addMinutes
} = require('date-fns');

const dayToNumber = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

module.exports = {
  async create(ctx) {
    const {
      user,
      coach,
      court,
      venue,
      day_of_week,
      start_time,
      duration,
      start_date,
      weeks_ahead,
      payment_method,
      force,    // 🆕 Allow frontend to override conflict warning
      sellerId
    } = ctx.request.body;

    console.log('Force:', force);

    const startDate = parseISO(start_date);
    const targetDay = dayToNumber[day_of_week];

    // Use next occurrence of the target weekday
    const baseDate = getDay(startDate) === targetDay
      ? startDate
      : nextDay(startDate, targetDay);

      const renovationDate = addWeeks(baseDate, weeks_ahead);

    // Create the Abono first
    const abono = await strapi.entityService.create('api::abono.abono', {
      data: {
        user,
        coach,
        court,
        venue,
        day_of_week,
        start_time,
        duration,
        start_date,
        weeks_ahead,
        status: 'active',
        payment_method,
        renovation_date: format(renovationDate, 'yyyy-MM-dd')
      }
    });

    // 🆕 Setup for processing reservations
    const conflictsList = [];
    const successfulDates = [];

    for (let i = 0; i < weeks_ahead; i++) {
      const date = addWeeks(baseDate, i);
      const startDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${start_time}`);
      const endDateTime = addMinutes(startDateTime, duration);

      const dateStr = format(date, 'yyyy-MM-dd');
      const startStr = format(startDateTime, 'HH:mm:ss');
      const endStr = format(endDateTime, 'HH:mm:ss');

      // ✅ Check for reservation conflicts
      const conflicts = await strapi.entityService.findMany('api::reservation.reservation', {
        filters: {
          date: { $eq: dateStr },
          court: { id: court },
          start_time: { $lt: endStr },
          end_time: { $gt: startStr }
        },
        publicationState: 'live'
      });

      if (conflicts.length > 0) {
        strapi.log.warn(`⛔ Conflict found: ${dateStr} ${startStr}`);
        conflictsList.push({ date: dateStr, start_time: startStr });
        continue;
      }

      // Store conflict-free slot
      successfulDates.push({ dateStr, startStr, endStr });
    }

    // 🛑 If conflicts exist and not forced, return early
    if (conflictsList.length > 0 && !force) {
      return ctx.badRequest('Conflicting reservations found', {
        conflicts: conflictsList,
        abonoId: abono.id
      });
    }

    // ✅ Fetch product now (after confirming we can proceed)
    const productService = strapi.service('api::product.custom-product');
    const product = await productService.findProductByDurationAndType(duration, 'abono', payment_method);

    console.log(product.sku, 'PRODUCT');

    // ✅ Create each conflict-free reservation
    for (const { dateStr, startStr, endStr } of successfulDates) {
      await strapi.entityService.create('api::reservation.reservation', {
        data: {
          type: 'abono',
          date: dateStr,
          start_time: startStr,
          end_time: endStr,
          duration,
          status: 'confirmed',
          court,
          venue,
          coach,
          owner: user,
          seller: sellerId || 74,
          products: product ? [product.id] : [],
          // abono: abono.id,
          publishedAt: new Date().toISOString()
        },
      });
    }

    // log the successful reservations
    console.log(`✅ ${successfulDates.length} reservations created for Abono ID: ${abono.id}, Product: ${product ? product.sku : 'None'}`);

    // ✅ Create a single transaction for the entire Abono
    if (product) {
      await strapi.entityService.create('api::transaction.transaction', {
        data: {
          abono: abono.id,
          client: user,
          products: [product.id],
          seller: 74,
          amount: product.price * successfulDates.length,
          status: 'Paid',
          payment_method: payment_method,
          notes: `Abono ${abono.id} - ${product.sku}`,
          source: 'mostrador',
          date: new Date().toISOString()
        }
      });
    }

    // ✅ Return success and info
    return {
      abono,
      message: `${successfulDates.length} reservations created. ${conflictsList.length} skipped.`,
      conflicts: conflictsList.length > 0 ? conflictsList : undefined
    };
  }, 
  async cancel(ctx) {
    const abonoId = ctx.params.abonoId;

    const abono = await strapi.entityService.findOne('api::abono.abono', abonoId);
    if (!abono) return ctx.notFound('Abono not found');

    // 1. Update abono status
    await strapi.entityService.update('api::abono.abono', abonoId, {
      data: {
        status: 'cancelled',
      },
    });

    // 2. Delete FUTURE reservations
    const today = new Date().toISOString().split('T')[0];

    const futureReservations = await strapi.entityService.findMany('api::reservation.reservation', {
      filters: {
        abono: { id: abonoId },
        date: { $gt: today },
      },
    });

    for (const res of futureReservations) {
      // Delete associated transactions
      const transactions = await strapi.entityService.findMany('api::transaction.transaction', {
        filters: {
          reservation: { id: res.id },
        },
      });

      for (const tx of transactions) {
        await strapi.entityService.delete('api::transaction.transaction', tx.id);
      }

      // Delete the reservation
      await strapi.entityService.delete('api::reservation.reservation', res.id);
    }

    return { message: `Abono ${abonoId} cancelled, ${futureReservations.length} future reservations and their transactions deleted.` };
  },
};