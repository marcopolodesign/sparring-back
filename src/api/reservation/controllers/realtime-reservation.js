'use strict';

const { toZonedTime, format } = require('date-fns-tz');
const { addMinutes, parseISO } = require('date-fns');

const TIME_ZONE = process.env.TZ || 'America/Argentina/Buenos_Aires';

module.exports = {
  async fetchRealtimeReservations(ctx) {
    let { trackIds } = ctx.params;
    const { date } = ctx.query;

    if (!trackIds) {
      return ctx.badRequest('At least one Track ID is required');
    }
    trackIds = trackIds.split(',');

    try {
      // 1. Get “now” in your timezone
      const nowUtc = new Date();
      const now = toZonedTime(nowUtc, TIME_ZONE);
      const nowPlus20 = addMinutes(now, 20);

      // 2. Build targetDate (yyyy-MM-dd) for your filter
      const today = format(now, 'yyyy-MM-dd', { timeZone: TIME_ZONE });
      const targetDate = date || today;

      // 3. Fetch all non-cancelled reservations for that date / tracks
      const reservations = await strapi.entityService.findMany(
        'api::reservation.reservation',
        {
          filters: {
            date: { $eq: targetDate },
            court: { id: { $in: trackIds } },
            status: { $ne: 'cancelled' },
          },
          populate: {
            court: true,
            owner: { fields: ['firstName', 'lastName'] },
          },
        }
      );

      // 4. Find the next upcoming reservation per track
      const closestByTrack = {};
      for (const r of reservations) {
        // parseISO yields a Date in local TZ; wrap it to enforce your zone
        const startLocal = toZonedTime(
          parseISO(`${r.date}T${r.start_time}`),
          TIME_ZONE
        );
        const endLocal = toZonedTime(
          parseISO(`${r.date}T${r.end_time}`),
          TIME_ZONE
        );

        if (startLocal <= nowPlus20 && endLocal >= now) {
          const tId = r.court.id;
          if (
            !closestByTrack[tId] ||
            startLocal < toZonedTime(
              parseISO(`${closestByTrack[tId].date}T${closestByTrack[tId].start_time}`),
              TIME_ZONE
            )
          ) {
            closestByTrack[tId] = r;
          }
        }
      }

      // 5. Build response with products & totals
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

        processed.push({
          trackId,
          trackName: resv.court.name,
          closestReservation: {
            id: resv.id,
            type: resv.type,
            ownerName: `${resv.owner?.firstName} ${resv.owner?.lastName}`,
            startTime: resv.start_time,
            endTime: resv.end_time,
            products,
            total,
          },
        });
      }

      ctx.send(processed);
    } catch (err) {
      console.error(err);
      ctx.internalServerError('An error occurred while fetching reservations');
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