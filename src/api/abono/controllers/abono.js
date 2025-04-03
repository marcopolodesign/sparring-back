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
        weeks_ahead
      } = ctx.request.body;
  
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
        }
      });
  
      const startDate = parseISO(start_date);
      const targetDay = dayToNumber[day_of_week];
  
      const baseDate = getDay(startDate) === targetDay
        ? startDate
        : nextDay(startDate, targetDay);
  
      let skipped = 0;
  
      for (let i = 0; i < weeks_ahead; i++) {
        const date = addWeeks(baseDate, i);
        const startDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${start_time}`);
        const endDateTime = addMinutes(startDateTime, duration);
  
        const dateStr = format(date, 'yyyy-MM-dd');
        const startStr = format(startDateTime, 'HH:mm:ss');
        const endStr = format(endDateTime, 'HH:mm:ss');
  
        // ✅ Check for conflicts
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
          strapi.log.warn(`Skipping abono on ${dateStr} at ${startStr} — conflict found.`);
          skipped++;
          continue;
        }
  
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
            publishedAt: new Date().toISOString()
          },
        });
      }
  
      return {
        abono,
        message: `${weeks_ahead - skipped} reservations created, ${skipped} skipped due to conflicts`
      };
    }
  };