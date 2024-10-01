    module.exports = {
        /**
         * Fetches upcoming matches with filtering logic.
         * @param {string} userId - The ID of the user to exclude from matches.
         * @param {Date} currentDate - The current date for filtering upcoming matches.
         * @returns {Promise<Array>} - List of upcoming matches.
         */
        async findUpcomingMatches(userId, currentDate) {
       const matches = await strapi.db.query('api::match.match').findMany({
          where: {
            Date: {
              $gt: currentDate, // Filter by date
            },
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
        });
      
          return matches;
        }
      }


