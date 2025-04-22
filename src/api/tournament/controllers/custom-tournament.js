
module.exports = {
    async findTournamentByUserId(ctx) {
        const { userId } = ctx.params;

        const today = new Date();

        if (!userId) {
            return ctx.badRequest('User ID is missing');
        }

        try {
     
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            
            const tournaments = await strapi.entityService.findMany('api::tournament.tournament', {
              filters: {
                start_date: {
                  $gte: today.toISOString().split('T')[0],
                  $lte: tomorrow.toISOString().split('T')[0], // Use $lt instead of $lte
                },
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