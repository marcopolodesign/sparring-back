'use strict';

module.exports = {
  async fetchReservationsWithTransactions({ venueId, date }) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Fetch all tracks for the given venue
    const venue = await strapi.entityService.findOne('api::court.court', venueId, {
      populate: { tracks: true },
    });

    if (!venue || !venue.tracks || venue.tracks.length === 0) {
      throw new Error('No tracks found for the given venue ID');
    }

    const trackIds = venue.tracks.map((track) => track.id);

    // Fetch reservations for the specified date
    const reservations = await strapi.entityService.findMany('api::reservation.reservation', {
      filters: {
        date: targetDate,
        court: { id: { $in: trackIds } },
      },
      populate: { court: true },
    });

    // Process reservations to include associated transactions and totals
    const processedReservations = [];
    for (const reservation of reservations) {
      const transactions = await strapi.entityService.findMany('api::transaction.transaction', {
        filters: { reservation: { id: reservation.id } },
      });

      const total = transactions.reduce((sum, txn) => sum + txn.amount, 0);

      processedReservations.push({
        ...reservation,
        transactions,
        total,
      });
    }

    return processedReservations;
  },
};
