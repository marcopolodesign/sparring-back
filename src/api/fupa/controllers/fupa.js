const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::tournament.tournament', ({ strapi }) => ({
  // Existing findParticipants function
  async findParticipants(ctx) {
    const { id } = ctx.params;

    try {
      // Fetch the tournament by ID, and populate participants
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', id, {
        populate: {
          participants: {
            fields: ['firstName', 'lastName'],
            populate: {
              profilePicture: {
                fields: ['url'],
              },
            },
          },
        },
      });

      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }

      // Map participants to only include required fields
      const participants = tournament.participants.map(participant => ({
        firstName: participant.firstName,
        lastName: participant.lastName,
        profilePictureUrl: participant.profilePicture?.url || null,
      }));

      ctx.body = participants;
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  // Existing findGroupMatches function
  async findGroupMatches(ctx) {
    const { id } = ctx.params;

    try {
      // Fetch the tournament by ID, and populate groups and their matches
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', id, {
        populate: {
          groups: {
            populate: {
              couples: {
                populate: '*',
              },
              matches: {
                populate: ['member_1', 'member_2', 'member_3', 'member_4'],
              },
            },
          },
        },
      });

      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }

      // Map each group to its matches
      const groupMatches = tournament.groups.map(group => ({
        groupName: group.name,
        matches: group.matches.map(match => ({
          match,
          // member_1: {
          //   id: match.match_owner.id, 
          //   name: match.match_owner.firstName,
          // },
          // member_2: {
          //   id: match.member_2.id,
          //   name: match.member_2.firstName,
          // },
          // member_3: {
          //   id: match.member_3.id,
          //   name: match.member_3.firstName,
          // },
          // member_4: {
          //   id: match.member_4.id,
          //   name: match.member_4.firstName,
          // },
          // score: match.score,
        })),
      }));

      ctx.body = groupMatches;
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  // New function to generate matches for each group in the tournament
  async generateMatchesForTournament(ctx) {
    const { id } = ctx.params;
  
    try {
      // Fetch the tournament by ID, and populate groups with couples and matches
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', id, {
        populate: {
          groups: {
            populate: {
              couples: {
                populate: '*', // Populate all fields within couples
              },
              matches: true, // Populate existing matches
            },
          },
        },
      });
  
      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }
  
      const matches = [];
  
      // Iterate over each group to generate matches
      for (const group of tournament.groups) {
        const couples = group.couples;
  
        if (couples.length !== 4) {
          throw new Error(`Group ${group.name} must have exactly 4 couples`);
        }
  
        const groupMatchIds = [];
  
        // Generate all possible matches for this group
        for (let i = 0; i < couples.length; i++) {
          for (let j = i + 1; j < couples.length; j++) {
  
            // Create 4 sets for each couple
            const sets = [];
  
            for (let setNumber = 1; setNumber <= 4; setNumber++) {
              const setComponent = {
                gamesWon: 0,  // Initialize with 0 games won
              };
              sets.push(setComponent);
            }
  
            // Prepare the match data with couple IDs, members, and newly created sets
            const matchData = {
              match_owner: couples[i].members[0].id, // Set participant1 of couple1 as match_owner
              member_1: couples[i].members[0].id,   // participant1 of couple1 as member_1
              member_2: couples[i].members[1].id,   // participant2 of couple1 as member_2
              member_3: couples[j].members[0].id,   // participant1 of couple2 as member_3
              member_4: couples[j].members[1].id,   // participant2 of couple2 as member_4
              ammount_players: 4, // Set the number of players
              group_name: group.name,  // Store group name or ID,
              tournament: id,
              description: `${group.name} - ${couples[i].members[0].firstName} & ${couples[i].members[1].firstName} vs ${couples[j].members[0].firstName} & ${couples[j].members[1].firstName}`,
              date: new Date().toISOString(), // You can customize the date logic
              publishedAt: new Date().toISOString(), // Ensure the match is published
              couples: [
                {
                  id: couples[i].id, // Pass the couple ID
                  members: [
                    { id: couples[i].members[0].id },
                    { id: couples[i].members[1].id }
                  ],
                  sets: sets // Assign the created sets to the couple
                },
                {
                  id: couples[j].id, // Pass the couple ID
                  members: [
                    { id: couples[j].members[0].id },
                    { id: couples[j].members[1].id }
                  ],
                  sets: sets // Assign the created sets to the couple
                }
              ]
            };
  
            // Create the match asynchronously
            const match = await strapi.entityService.create('api::match.match', { data: matchData });
            matches.push(match);
            groupMatchIds.push({ id: match.id }); // Wrap the match ID in an object
          }
        }
  
        // Update the group with the newly created matches
        group.matches = [...group.matches.map(m => ({ id: m.id })), ...groupMatchIds];
      }
  
      // Update the entire tournament with the modified groups
      await strapi.entityService.update('api::tournament.tournament', id, {
        data: {
          groups: tournament.groups,
        },
      });
  
      ctx.body = { message: 'Matches generated and added to groups successfully', matches };
    } catch (err) {
      ctx.throw(500, err.message);
    }
  },
  
  
  async findMatchesWithCouples(ctx) {
    const { id } = ctx.params;

    try {
      // Fetch the tournament by ID, and populate groups, matches, couples, members, and profile pictures
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', id, {
        populate: {
          groups: {
            populate: {
              matches: {
                populate: {
                  couples: {
                    populate: {
                      members: {
                        populate: {
                          profilePicture: {
                            fields: ['url'] // Populate only the URL of the profile picture
                          }
                        },
                        fields: ['id', 'firstName', 'lastName'], // Select specific fields to populate
                      },
                      sets: {
                        populate: {
                          games: {
                            fields: ['gamesWon'], // Populate games if needed
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }

      // Map each group to its matches with populated couples and members
      const groupMatches = tournament.groups.map(group => ({
        groupName: group.name,
        matches: group.matches.map(match => ({
          id: match.id,
          description: match.description,
          date: match.Date,
          couples: match.couples.map(couple => ({
            id: couple.id,
            members: couple.members.map(member => ({
              id: member.id,
              firstName: member.firstName,
              lastName: member.lastName,
              profilePictureUrl: member.profilePicture ? member.profilePicture.url : null,
            })),
            sets: couple.sets
          }))
        }))
      }));

      ctx.body = groupMatches;
    } catch (err) {
      ctx.throw(500, err.message);
    }
  },

  
  async removeFourthSet(ctx) {
    const { id } = ctx.params;

    try {
      // Call the function to remove the 4th set
      await removeFourthSetFromTournamentMatches(id);

      ctx.send({ message: 'Successfully removed the 4th set from all matches in the tournament.' });
    } catch (error) {
      ctx.throw(500, 'Failed to remove the 4th set from matches.');
    }
  },


}));


async function removeFourthSetFromTournamentMatches(tournamentId) {
  try {
    // Fetch the tournament by ID and populate its matches
    const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentId, {
      populate: {
        groups: {
          populate: {
            matches: {
              populate: {
                couples: {
                  populate: {
                    sets: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Iterate over each group and each match
    for (const group of tournament.groups) {
      for (const match of group.matches) {
        let setsModified = false;

        // Iterate over each couple in the match
        match.couples.forEach(couple => {
          if (couple.sets.length > 3) {
            // Remove the 4th set
            couple.sets.splice(3, 1);
            setsModified = true;
          }
        });

        // If sets were modified, update the match
        if (setsModified) {
          await strapi.entityService.update('api::match.match', match.id, {
            data: {
              couples: match.couples,
            },
          });
        }
      }
    }

    console.log('Successfully removed the 4th set from all matches.');
  } catch (error) {
    console.error('Error removing the 4th set from matches:', error);
  }
}