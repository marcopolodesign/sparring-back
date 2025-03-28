module.exports = {
    async findUpcomingMatches(userId, currentDate, isMatchOwner) {
      console.log(isMatchOwner, 'IS MATCH OWNER TESTING SERVICE');
      // Initial query without checking members length (we will do this in JS)
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
                $and: [
                  // Exclude matches where the user is already a member or match owner
                  {
                    $or: [
                      { member_1: { id: { $ne: userId } } },
                      { member_2: { id: { $ne: userId } } },
                      { member_3: { id: { $ne: userId } } },
                      { member_4: { id: { $ne: userId } } },
                    ],
                  },
                  {
                    match_owner: {
                      id: {
                        $ne: userId, // Exclude matches where the user is the match owner
                      },
                    },
                  },
                  {
                    is_private: { $ne: true }, // Exclude private matches if not matchOwner
                  },
                ],
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
          couples: { populate: true }, 
          member_1: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_1
          member_2: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_2
          member_3: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_3
          member_4: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_4
          location: true, // Populate location
          sport: true, // Populate sport
        },
      };
  
      // Fetch the matches from the database
      const matches = await strapi.db.query('api::match.match').findMany(query);
  
      // Post-process the matches in JavaScript
      const filteredMatches = matches.filter((match) => {
        // Exclude matches where members.length >= ammount_players
        const membersCount = [match.member_1, match.member_2, match.member_3, match.member_4].filter(Boolean).length;
  
        if (!isMatchOwner) {
            if (membersCount >= match.ammount_players) {
                console.log(membersCount, 'MEMBERS COUNT')
              return false; // Exclude matches that are already full
            }
        }
  
        // Exclude matches where the user is already a member
        // const isUserMember = [match.member_1, match.member_2, match.member_3, match.member_4].some(
        //   (member) => member?.id === userId
        // );

        console.log(match.members, 'MATCH MEMBERS UPCOMING MATCHES');
        match.members.some((member) => console.log (member.id, "MEMBER ID UPCOMING MATCHES MATCH.MEMBERS"));
        match.members.forEach((member) => {
        console.log(member.id, 'MEMBER ID UPCOMING Match')
        console.log(Number(member.id) === Number(userId), 'MEMBER ID === USER ID UPCOMING MATCHES')
        console.log(userId, 'USER ID FROM UPCOMING MATCHES INSIDE MATCH LOOP')

    });
        console.log(userId, 'USER ID FROM UPCOMING MATCHES')
        // const isUserMember = match.members?.some((member) => member.id === userId);
        const isUserMember = match.members?.some((member) => Number(member.id) === Number(userId));
        console.log(isUserMember, 'IS USER MEMBER UPCOMING MATCHES');

        if (isUserMember && !isMatchOwner) {
          return false; // Exclude matches where the user is already a member
        }
  
        return true;
      });
  
      return filteredMatches;
    },

    async findEndedMatches(userId, currentDate, isMatchOwner) {
      // Initial query without checking members length (we will do this in JS)
      let query = {
        where: {
          Date: {
            $lt: currentDate, // Filter by date (ended matches)
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
                $and: [
                  // Exclude matches where the user is already a member or match owner
                  {
                    $or: [
                      { member_1: { id: { $ne: userId } } },
                      { member_2: { id: { $ne: userId } } },
                      { member_3: { id: { $ne: userId } } },
                      { member_4: { id: { $ne: userId } } },
                    ],
                  },
                  {
                    match_owner: {
                      id: {
                        $ne: userId, // Exclude matches where the user is the match owner
                      },
                    },
                  },
                ],
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
          couples: { populate: true }, // Populate couples
          member_1: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_1
          member_2: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_2
          member_3: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_3
          member_4: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_4
          location: true, // Populate location
          sport: true, // Populate sport
          
        },
      };
  
      // Fetch the matches from the database
      const matches = await strapi.db.query('api::match.match').findMany(query);

      console.log(matches, 'MATCHES FROM ENDED MATCHES');
  
      // Post-process the matches in JavaScript
      const filteredMatches = matches.filter((match) => {
        // Exclude matches where members.length >= ammount_players
        const membersCount = [match.member_1, match.member_2, match.member_3, match.member_4].filter(Boolean).length;
  
        if (!isMatchOwner) {
            if (membersCount >= match.ammount_players) {
                // console.log(membersCount, 'MEMBERS COUNT')
              return false; // Exclude matches that are already full
            }
        }
  
        const isUserMember = match.members?.some((member) => Number(member.id) === Number(userId));

        if (isUserMember && !isMatchOwner) {
          return false; // Exclude matches where the user is already a member
        }
  
        return true;
      });
  
      return filteredMatches;
    },
  };