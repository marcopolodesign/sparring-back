
module.exports = {
    async findTournamentByUserId(ctx) {
        const { userId } = ctx.params;

        const today = new Date();

        if (!userId) {
            return ctx.badRequest('User ID is missing');
        }

        try {
            const tournaments = await strapi.entityService.findMany('api::tournament.tournament', {
                filters: {
                    start_date: { $gte: today.toISOString().split('T')[0] },
                    participants: { id: { $in: [userId] } },
                    admins: { id: { $in: [userId] } },
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