module.exports = {
    async findUpcomingMatches(userId, currentDate, isMatchOwner) {
      let query = {
        where: {
          Date: {
            $gt: currentDate, // Filter by date
          },
          tournament: {
            id: {
              $null: true,
            },
          },
          $and: [
            {
            //   $or: [
            //     { member_1: { $null: true } },
            //     { member_2: { $null: true } },
            //     { member_3: { $null: true } },
            //     { member_4: { $null: true } },
            //   ],
            },
            {
              // Exclude matches where the user is already a member
              $or: [
                { member_1: { id: isMatchOwner ? {$eq: userId}: { $ne: userId } } },
                { member_2: { id: isMatchOwner ? {$eq: userId}: { $ne: userId } } },
                { member_3: { id: isMatchOwner ? {$eq: userId}: { $ne: userId } } },
                { member_4: { id: isMatchOwner ? {$eq: userId}: { $ne: userId } }  },
              ],
            },
          ],
        },
        populate: {
            match_owner: { 
              populate: { 
                profilePicture: { fields: ['url'] } // Populate profilePicture fields of match_owner
              }
            },
            members: { 
              populate: { 
                profilePicture: { fields: ['url'] } // Populate profilePicture fields of members
              } 
            },
            member_1: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_1
            member_2: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_2
            member_3: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_3
            member_4: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_4
            location: true,  // Populate location
            sport: true      // Populate sport
          },
      };
  

      console.log('query', query);
      // Modify the query based on the isMatchOwner condition
    //   if (isMatchOwner) {

    //     console.log('isMatchOwnerrrrr', isMatchOwner);
    //     query.where.$and.push({
    //       // If the user is the match owner, add extra conditions
    //       $or: [
    //         { member_1: { id: { $ne: userId } } },
    //         { member_2: { id: { $ne: userId } } },
    //         { member_3: { id: { $ne: userId } } },
    //         { member_4: { id: { $ne: userId } } },
    //       ],
    //     });

        
    //   }
  
      // Perform the query
      const matches = await strapi.db.query('api::match.match').findMany(query);
      return matches;
    },
  };