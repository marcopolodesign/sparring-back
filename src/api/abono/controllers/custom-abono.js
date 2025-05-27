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

// Helper to calculate baseDate and renovationDate
function calculateDates(start_date, day_of_week, weeks_ahead, action) {

  const startDate = parseISO(start_date);
  const targetDay = dayToNumber[day_of_week];

  const baseDate = getDay(startDate) === targetDay
    ? startDate
    : nextDay(startDate, targetDay);

  // ✅ Adjust renovationDate to be weeks_ahead - 1
  const renovationDate = addWeeks(baseDate, weeks_ahead - 1);
  return { baseDate, renovationDate };
}

// Helper to check for conflicts
async function checkConflicts(baseDate, weeks_ahead, start_time, duration, court) {
  const conflictsList = [];
  const successfulDates = [];
  const now = new Date();

  for (let i = 0; i < weeks_ahead; i++) {
    const date = addWeeks(baseDate, i);
    const startDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${start_time}`);
    const endDateTime = addMinutes(startDateTime, duration);

    // ✅ Skip reservations for today if the start time has already passed
    if (format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd') && startDateTime <= now) {
      strapi.log.info(`⏩ Skipping reservation for ${format(date, 'yyyy-MM-dd')} at ${start_time} because it overlaps with the current time.`);
      continue;
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    const startStr = format(startDateTime, 'HH:mm:ss');
    const endStr = format(endDateTime, 'HH:mm:ss');

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

    successfulDates.push({ dateStr, startStr, endStr });
  }

  return { conflictsList, successfulDates };
}

// Helper to create reservations
async function createReservations(successfulDates, abonoId, user, court, venue, coach, sellerId, duration, product, student_amount, payment_method) {
  for (const { dateStr, startStr, endStr } of successfulDates) {
    await strapi.entityService.create('api::reservation.reservation', {
      data: {
        type: student_amount ? 'abonoClase' : 'abono',
        date: dateStr,
        start_time: startStr,
        end_time: endStr,
        duration,
        status: payment_method === 'weekly' ? 'pending_payment' : 'confirmed', 
        court,
        venue,
        coach,
        owner: user,
        seller: sellerId || 74,
        products: product ? [product.id] : [],
        abono: abonoId,
        publishedAt: new Date().toISOString()
      },
    });
  }
}

// Helper to create a log entry
async function createLogEntry(action, abonoId, sellerId) {
  const description = `Abono ${action} el día ${format(new Date(), 'yyyy-MM-dd')} por usuario ${sellerId}`;
  await strapi.entityService.create('api::log-entry.log-entry', {
    data: {
      action: `abono.${action}`,
      description,
      timestamp: new Date(),
      user: sellerId,
      abono: abonoId
    }
  });
}

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
      force,
      sellerId, 
      notes
    } = ctx.request.body;

    console.log('Force:', force);

    const { baseDate, renovationDate } = calculateDates(start_date, day_of_week, weeks_ahead, 'create');



    const { conflictsList, successfulDates } = await checkConflicts(baseDate, weeks_ahead, start_time, duration, court);

    if (conflictsList.length > 0 && !force) {
      return ctx.badRequest('Conflicting reservations found', {
        conflicts: conflictsList,
        // abonoId: abono.id
      });
    }

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
        renovation_date: format(renovationDate, 'yyyy-MM-dd'), 
        type: 'alquiler',
        notes
      }
    });

    const productService = strapi.service('api::product.custom-product');
    const product = await productService.findProductByDurationAndType(duration, 'abono', payment_method);

    await createReservations(successfulDates, abono.id, user, court, venue, coach, sellerId, duration, product, payment_method);

    // ✅ Create a log entry for the create action
    await createLogEntry('creado', abono.id, sellerId);

    strapi.log.info(`✅ ${successfulDates.length} reservations created for Abono ID: ${abono.id}, Product: ${product ? product.sku : 'None'}`);

    return {
      abono,
      message: `${successfulDates.length} reservations created. ${conflictsList.length} skipped.`,
      conflicts: conflictsList.length > 0 ? conflictsList : undefined
    };
  },

  async cancel(ctx) {
    const abonoId = ctx.params.abonoId;
    const sellerId = ctx.params.sellerId;


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

    // ✅ Create a log entry for the cancel action
    await createLogEntry('cancelado', abonoId, sellerId);

    return { message: `Abono ${abonoId} cancelled, ${futureReservations.length} future reservations and their transactions deleted.` };
  },

  async update(ctx) {
    console.log(ctx.request.body);

    const {
      coach,
      court,
      day_of_week,
      duration,
      force,
      payment_method,
      sellerId,
      start_date,
      start_time,
      venue,
      weeks_ahead, 
      abonoId, 
      user
    } = ctx.request.body.data;


    // ✅ Handle court as either a number or an object
    const courtId = typeof court === 'object' && court !== null ? court.id : court;

    // ✅ Pass 'update' action to calculateDates
    const { baseDate, renovationDate } = calculateDates(start_date, day_of_week, weeks_ahead, 'update');


    const { conflictsList, successfulDates } = await checkConflicts(baseDate, weeks_ahead, start_time, duration, courtId);

    if (conflictsList.length > 0 && !force) {
      return ctx.badRequest('Conflicting reservations found', {
        conflicts: conflictsList,
        // abonoId: abonoId
      });
    }


    const abono = await strapi.entityService.update('api::abono.abono', abonoId, {
      data: {
        user,
        coach,
        court: courtId,
        venue,
        day_of_week,
        start_time,
        duration,
        start_date,
        weeks_ahead,
        payment_method,
        renovation_date: format(renovationDate, 'yyyy-MM-dd')
      }
    });

    const productService = strapi.service('api::product.custom-product');
    const product = await productService.findProductByDurationAndType(duration, 'abono', payment_method);

    await createReservations(successfulDates, abono.id, user, courtId, venue, coach, sellerId, duration, product);

    // ✅ Create a log entry for the update action
    await createLogEntry('renovado', abono.id, sellerId);

    strapi.log.info(`✅ ${successfulDates.length} reservations updated for Abono ID: ${abono.id}, Product: ${product ? product.sku : 'None'}`);

    return {
      abono,
      message: `${successfulDates.length} reservations updated. ${conflictsList.length} skipped.`,
      conflicts: conflictsList.length > 0 ? conflictsList : undefined
    };
  }, 


  async createClase(ctx) {
    const {
      user,
      coach,
      court,
      venue,
      start_time,
      duration,
      day_of_week,
      start_date,
      weeks_ahead,
      payment_method,
      force,
      sellerId,
      student_amount,
      notes
    } = ctx.request.body;

    try {
      const { baseDate, renovationDate } = calculateDates(start_date, day_of_week, weeks_ahead, 'create');

      const { conflictsList, successfulDates } = await checkConflicts(baseDate, weeks_ahead, start_time, duration, court);

      if (conflictsList.length > 0 && !force) {
        return ctx.badRequest('Conflicting reservations found', {
          conflicts: conflictsList,
          // abonoId: abono.id,
        });
      }


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
          renovation_date: format(renovationDate, 'yyyy-MM-dd'),
          type: 'clase', // Set type to 'clase'
          notes
        },
      });

  

      const productService = strapi.service('api::product.custom-product');
      const product = await productService.findProductByDurationAndType(duration, 'clase', payment_method, start_time, venue, court, student_amount);

      await createReservations(successfulDates, abono.id, user, court, venue, coach, sellerId, duration, product, student_amount, payment_method);

      await createLogEntry('creado', abono.id, sellerId);

      strapi.log.info(`✅ ${successfulDates.length} reservations created for Clase ID: ${abono.id}, Product: ${product ? product.sku : 'None'}`);

      return {
        abono,
        message: `${successfulDates.length} reservations created. ${conflictsList.length} skipped.`,
        conflicts: conflictsList.length > 0 ? conflictsList : undefined,
      };
    } catch (error) {
      strapi.log.error('Error creating Clase:', error);
      ctx.throw(500, 'Failed to create Clase.');
    }
  },

  async updateClase(ctx) {
    const {
      user,
      coach,
      court,
      venue,
      day_of_week,
      duration,
      start_date,
      start_time,
      weeks_ahead,
      payment_method,
      force,
      sellerId,
      student_amount,
      abonoId,
    } = ctx.request.body;

    try {
      const courtId = typeof court === 'object' && court !== null ? court.id : court;

      const { baseDate, renovationDate } = calculateDates(start_date, day_of_week, weeks_ahead, 'update');

      const { conflictsList, successfulDates } = await checkConflicts(baseDate, weeks_ahead, start_time, duration, courtId);

      if (conflictsList.length > 0 && !force) {
        return ctx.badRequest('Conflicting reservations found', {
          conflicts: conflictsList,
          // abonoId: abonoId,
        });
      }

      const abono = await strapi.entityService.update('api::abono.abono', abonoId, {
        data: {
          user,
          coach,
          court: courtId,
          venue,
          day_of_week,
          start_time,
          duration,
          start_date,
          weeks_ahead,
          payment_method,
          renovation_date: format(renovationDate, 'yyyy-MM-dd'),
        },
      });

     

      const productService = strapi.service('api::product.custom-product');
      const product = await productService.findProductByDurationAndType(duration, 'clase', payment_method, start_time, venue, courtId, student_amount);

      await createReservations(successfulDates, abono.id, user, courtId, venue, coach, sellerId, duration, product, student_amount);

      await createLogEntry('renovado', abono.id, sellerId);

      strapi.log.info(`✅ ${successfulDates.length} reservations updated for Clase ID: ${abono.id}, Product: ${product ? product.sku : 'None'}`);

      return {
        abono,
        message: `${successfulDates.length} reservations updated. ${conflictsList.length} skipped.`,
        conflicts: conflictsList.length > 0 ? conflictsList : undefined,
      };
    } catch (error) {
      strapi.log.error('Error updating Clase:', error);
      ctx.throw(500, 'Failed to update Clase.');
    }
  },
};