module.exports = {
    async findUpcomingMatches(userId, currentDate, isMatchOwner) {
      let query = {
        where: {
          Date: {
            $gt: currentDate, // Filter by date (upcoming matches)
          },
          tournament: {
            id: {
              $null: true, // Only matches with no tournament
            },
          },
          // Condition based on isMatchOwner
          ...(isMatchOwner
            ? {
                $or: [
                  { member_1: { id: userId } }, // Match if user is in any member slot
                  { member_2: { id: userId } },
                  { member_3: { id: userId } },
                  { member_4: { id: userId } },
                ],
              }
            : {
                $or: [
                    { member_1: { id: { $ne: userId } } },
                    { member_2: { id: { $ne: userId } } },
                    { member_3: { id: { $ne: userId } } },
                    { member_4: { id: { $ne: userId } } },
                  ],
                members: {
                  id: {
                    $ne: userId, // Exclude matches where the user is a member
                  },
                },
              }),
        },
        populate: {
          match_owner: {
            populate: {
              profilePicture: { fields: ['url'] }, // Populate profilePicture fields of match_owner
            },
          },
          members: {
            populate: {
              profilePicture: { fields: ['url'] }, // Populate profilePicture fields of members
            },
          },
          member_1: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_1
          member_2: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_2
          member_3: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_3
          member_4: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_4
          location: true, // Populate location
          sport: true, // Populate sport
        },
      };
  
      // Perform the query
      const matches = await strapi.db.query('api::match.match').findMany(query);
      return matches;
    },
  };