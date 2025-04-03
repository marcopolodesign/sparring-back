const {
    addWeeks,
    format,
    parseISO,
    getDay,
    nextDay,
    addMinutes,
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
  
  const getNextDateForWeekday = (startDate, dayName) => {
    const dayNumber = dayToNumber[dayName];
    return getDay(startDate) === dayNumber
      ? startDate
      : nextDay(startDate, dayNumber);
  };
  
  module.exports = {
    extendAbonos: {
      task: async ({ strapi }) => {
        strapi.log.info('🔁 Running Abono Auto-Extension Cron');
  
        const abonos = await strapi.entityService.findMany('api::abono.abono', {
          filters: { status: 'active' },
          populate: ['user', 'coach', 'court', 'venue'],
        });
  
        for (const abono of abonos) {
          const { id, user, coach, court, venue, start_time, duration, day_of_week } = abono;
  
          // Step 1: Check existing future reservations
          const existingFuture = await strapi.entityService.findMany('api::reservation.reservation', {
            filters: {
              type: 'abono',
              owner: user.id,
              court: court.id,
              date: { $gte: format(new Date(), 'yyyy-MM-dd') },
            },
          });
  
          if (existingFuture.length >= 2) {
            strapi.log.info(`⏭ Abono ${id} skipped — has ${existingFuture.length} future reservations.`);
            continue;
          }
  
          // Step 2: Generate next reservation
          const lastResDate = existingFuture.length
            ? parseISO(existingFuture[existingFuture.length - 1].date)
            : new Date();
  
          const nextDate = addWeeks(getNextDateForWeekday(lastResDate, day_of_week), 1);
          const startDateTime = new Date(`${format(nextDate, 'yyyy-MM-dd')}T${start_time}`);
          const endDateTime = addMinutes(startDateTime, duration);
  
          // Step 3: Prevent double-booking
          const hasConflict = await strapi.entityService.findMany('api::reservation.reservation', {
            filters: {
              date: format(nextDate, 'yyyy-MM-dd'),
              court: { id: court.id },
              start_time: { $lt: format(endDateTime, 'HH:mm:ss') },
              end_time: { $gt: format(startDateTime, 'HH:mm:ss') },
            },
          });
  
          if (hasConflict.length > 0) {
            strapi.log.warn(`⚠️ Conflict for Abono ${id} on ${format(nextDate, 'yyyy-MM-dd')} — skipping`);
            continue;
          }
  
          // Step 4: Create the reservation
          await strapi.entityService.create('api::reservation.reservation', {
            data: {
              type: 'abono',
              date: format(nextDate, 'yyyy-MM-dd'),
              start_time: format(startDateTime, 'HH:mm:ss'),
              end_time: format(endDateTime, 'HH:mm:ss'),
              duration,
              status: 'confirmed',
              court: court.id,
              venue: venue.id,
              coach: coach?.id || null,
              owner: user.id,
              publishedAt: new Date().toISOString()
            },
          });
  
          strapi.log.info(`✅ Created next reservation for Abono ${id} on ${format(nextDate, 'yyyy-MM-dd')}`);
        }
      },
      options: {
        rule: '0 5 * * 1', // Every Monday at 5am
      },
    },
  };