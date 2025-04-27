'use strict';
const { parse, formatISO } = require('date-fns');

module.exports = {
    async findTournamentByUserId(ctx) {
        const { userId } = ctx.params;

        const today = new Date();

        if (!userId) {
            return ctx.badRequest('User ID is missing');
        }

        try {
     
          const today = new Date();
          const threeDaysFromNow = new Date();
          threeDaysFromNow.setDate(today.getDate() + 1);
          
          const todayISO = new Date(today.setUTCHours(0, 0, 0, 0)).toISOString().split('T')[0];
          const onedayISO = new Date(threeDaysFromNow.setUTCHours(0, 0, 0, 0)).toISOString().split('T')[0];
          
          const tournaments = await strapi.entityService.findMany('api::tournament.tournament', {
            filters: {
              // start_date: { $gte: todayISO },  // Optional, but makes logic more clear
              end_date: { $gte: onedayISO },
              $or: [
                { participants: { id: { $in: [userId] } } },
                { admins: { id: { $in: [userId] } } },
              ],
            },
            populate: '*',
          });
        


            if (!tournaments || tournaments.length === 0) {
                return ctx.notFound('No tournaments found for the given user ID');
            }

            ctx.send(tournaments);
        } catch (error) {
            ctx.internalServerError('An error occurred while searching for tournaments');
        }
    }, 
    async updateTournament(ctx) {
        const { id } = ctx.params;
        const { data } = ctx.request.body;

        if (!id || !data) {
            return ctx.badRequest('Tournament ID or data is missing');
        }

        try {
            const updatedTournament = await strapi.entityService.update('api::tournament.tournament', id, {
                data,
            });

            ctx.send(updatedTournament);
        } catch (error) {
            ctx.internalServerError('An error occurred while updating the tournament');
        }
    },
    async deleteTournament(ctx) {
        const { id } = ctx.params;

        if (!id) {
            return ctx.badRequest('Tournament ID is missing');
        }

        try {
            await strapi.entityService.delete('api::tournament.tournament', id);
            ctx.send({ message: 'Tournament deleted successfully' });
        } catch (error) {
            ctx.internalServerError('An error occurred while deleting the tournament');
        }
    },

    async shiftMatchDates(ctx) {
      const { tournamentId, newDate } = ctx.request.body;
  
      if (!tournamentId || !newDate) {
        return ctx.badRequest('tournamentId and newDate are required');
      }
  
      const matches = await strapi.entityService.findMany('api::match.match', {
        filters: {
          tournament: {
            id: tournamentId,
          },
        },
        populate: ['tournament'],
        limit: 1000,
      });
  
      if (matches.length === 0) {
        return ctx.send({ message: 'No matches found for this tournament.' });
      }
  
      // If the incoming newDate is already ISO (good)
      // If not, parse and convert it
      let newDateISO;
  
      try {
        // Try to parse user-provided date
        const parsedDate = parse(newDate, 'MM/dd/yyyy hh:mm a', new Date());
        newDateISO = formatISO(parsedDate); // <-- Converts to ISO
      } catch (error) {
        return ctx.badRequest('Invalid date format provided.');
      }
  
      const updatedMatches = await Promise.all(
        matches.map(async (match) => {
          return strapi.entityService.update('api::match.match', match.id, {
            data: {
              Date: newDateISO, // <-- ISO format here
            },
          });
        })
      );
  
      return ctx.send({ updatedMatches });
    },
};