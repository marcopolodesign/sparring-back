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
          threeDaysFromNow.setDate(today.getDate() + 3);
          
          const todayISO = new Date(today.setUTCHours(0, 0, 0, 0)).toISOString().split('T')[0];
          const threeDaysISO = new Date(threeDaysFromNow.setUTCHours(0, 0, 0, 0)).toISOString().split('T')[0];
          
          const tournaments = await strapi.entityService.findMany('api::tournament.tournament', {
            filters: {
              // start_date: { $gte: todayISO },  // Optional, but makes logic more clear
              end_date: { $gte: threeDaysISO },
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
    }
};