'use strict';

const { toZonedTime, format } = require('date-fns-tz');
const { addMinutes, parseISO } = require('date-fns');

const TIME_ZONE = process.env.TZ || 'America/Argentina/Buenos_Aires';

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
      const now = toZonedTime(new Date(), TIME_ZONE);
      const nowPlus10 = toZonedTime(addMinutes(new Date(), 10), TIME_ZONE);

      // 2. Build yyyy-MM-dd for filtering
      const today      = format(now, 'yyyy-MM-dd');
      const targetDate = date || today;

      console.log('Target date:', targetDate);
      console.log('Now:', now);
      console.log('Now + 10min:', nowPlus10);

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
            owner: { fields: ['firstName', 'lastName', 'id'] },
          },
        }
      );

      console.log('Fetched reservations:', reservations);

      // 4. Find the closest upcoming reservation per track
      const closestByTrack = {};
      for (const r of reservations) {
        const startLocal = parseISO(`${r.date}T${r.start_time}`);
        const endLocal   = parseISO(`${r.date}T${r.end_time}`);

        if (startLocal <= nowPlus10 && endLocal >= now) {
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
            ownerId:   resv.owner?.id,
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

  async fetchMostRecentReservationByUser(ctx) {
    const { userId } = ctx.params;
    if (!userId) return ctx.badRequest('User ID is required');

    try {
      // 1. Fetch the latest reservation
      const [resv] = await strapi.entityService.findMany(
        'api::reservation.reservation',
        {
          filters: { owner: { id: userId } },
          sort: { date: 'desc', start_time: 'desc' },
          limit: 1,
          populate: {
            court: true,
            owner: { fields: ['firstName', 'lastName'] },
          },
        }
      );

      if (!resv) return ctx.notFound('No reservations found');

      // 2. Load its transactions & compute total
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
      const products = txns.flatMap((txn) =>
        (txn.products || []).map((p) => {
          const price = p.custom_price?.[0]?.custom_ammount ?? p.price;
          total += price;
          return {
            id: p.id,
            name: p.Name,
            type: p.type,
            price,
            transactionStatus: txn.status,
          };
        })
      );

      // 3. Return structured response
      ctx.send({
        reservation: {
          id: resv.id,
          type: resv.type,
          ownerName: `${resv.owner?.firstName} ${resv.owner?.lastName}`,
          date: resv.date,
          startTime: resv.start_time,
          endTime: resv.end_time,
          court: { id: resv.court.id, name: resv.court.name },
        },
        products,
        total,
      });
    } catch (err) {
      console.error(err);
      ctx.internalServerError('An error occurred while fetching the reservation');
    }
  },
};