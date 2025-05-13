'use strict';

const { format, addMinutes, parseISO } = require('date-fns');

module.exports = {
  async fetchRealtimeReservations(ctx) {
    console.log('Raw request params:', ctx.params);

    let { trackIds } = ctx.params;
    const { date } = ctx.query;

    if (!trackIds) {
      return ctx.badRequest('At least one Track ID is required');
    }
    trackIds = trackIds.split(',');

    try {
      // 1. “now” in local TZ and +20 minutes
      const now       = new Date();
      const nowPlus20 = addMinutes(now, 20);

      // 2. Build yyyy-MM-dd for filtering
      const today      = format(now, 'yyyy-MM-dd');
      const targetDate = date || today;

      console.log('Target date:', targetDate);
      console.log('Now:', now);
      console.log('Now + 20min:', nowPlus20);

      // 3. Fetch non-cancelled reservations for those tracks on targetDate
      const reservations = await strapi.entityService.findMany(
        'api::reservation.reservation',
        {
          filters: {
            date:   { $eq: targetDate },
            court:  { id: { $in: trackIds } },
            status: { $ne: 'cancelled' },
          },
          populate: {
            court: true,
            owner: { fields: ['firstName', 'lastName'] },
          },
        }
      );

      // 4. Find the closest upcoming reservation per track
      const closestByTrack = {};
      for (const r of reservations) {
        const startLocal = parseISO(`${r.date}T${r.start_time}`);
        const endLocal   = parseISO(`${r.date}T${r.end_time}`);

        if (startLocal <= nowPlus20 && endLocal >= now) {
          const tId = r.court.id;
          const existingStart = closestByTrack[tId]
            ? parseISO(`${closestByTrack[tId].date}T${closestByTrack[tId].start_time}`)
            : null;

          if (!existingStart || startLocal < existingStart) {
            closestByTrack[tId] = r;
          }
        }
      }

      // 5. For each track’s closest reservation, load products & compute total
      const processed = [];
      for (const [trackId, resv] of Object.entries(closestByTrack)) {
        const txns = await strapi.entityService.findMany(
          'api::transaction.transaction',
          {
            filters: { reservation: { id: resv.id } },
            populate: {
              products: {
                populate: { custom_price: { fields: ['custom_ammount'] } },
                fields: ['Name', 'type', 'price'],
              },
            },
          }
        );

        let total = 0;
        const products = txns.flatMap(txn =>
          (txn.products || []).map(p => {
            const price = p.custom_price?.[0]?.custom_ammount ?? p.price;
            total += price;
            return {
              id:               p.id,
              name:             p.Name,
              type:             p.type,
              price,
              transactionStatus: txn.status,
            };
          })
        );

        processed.push({
          trackId,
          trackName: resv.court.name,
          closestReservation: {
            id:        resv.id,
            type:      resv.type,
            ownerName: `${resv.owner?.firstName} ${resv.owner?.lastName}`,
            startTime: resv.start_time,
            endTime:   resv.end_time,
            products,
            total,
          },
        });
      }

      return ctx.send(processed);
    } catch (err) {
      console.error('Error fetching real-time reservations:', err);
      return ctx.internalServerError('An error occurred while fetching reservations');
    }
  },
};