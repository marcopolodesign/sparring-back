const { createCoreController } = require('@strapi/strapi').factories;
const axios = require('axios');

module.exports = createCoreController('api::tournament.tournament', ({ strapi }) => ({


  async findTournamentDetails(ctx) {
    const { id } = ctx.params; // Get the tournament ID from the request params

    try {
      // Fetch the tournament and populate the required fields
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', id, {
        populate: {
          venue: {
            populate: {
              location: true, // Populate location inside venue
              logo: {         // Populate logo inside venue
                populate: {
                  formats: true, // Include all image formats for logo
                },
              },
              cover: {        // Populate cover inside venue
                populate: {
                  formats: true, // Include all image formats for cover
                },
              },
            },
          },
          accepted_levels: true, // Populate accepted levels
          logo: true,            // Populate logo
          cover: true,           // Populate cover
          main_sponsors: true,   // Populate main sponsors
          sponsors: true,        // Populate sponsors
          participants: true,    // Populate participants
          sport: true,           // Populate sport
          ranking: true,         // Populate ranking
        },
      });

      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }

      ctx.send(tournament);
    } catch (err) {
      console.error('Error fetching tournament details:', err);
      ctx.throw(500, 'Internal server error');
    }
  },


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

  async findCouplesByGroup(ctx) {
    const { id } = ctx.params;
  
    try {
      // Fetch the tournament by ID, populating groups and their couples
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', id, {
        populate: {
          groups: {
            populate: {
              couples: {
                populate: {
                  members: {
                    fields: ['id', 'firstName', 'lastName'],
                    populate: {
                      profilePicture: {
                        fields: ['url'],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
  
      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }
  
      // Map each group to its couples and their members
      const groups = tournament.groups.map(group => ({
        groupName: group.name,
        couples: group.couples.map(couple => ({
          coupleId: couple.id,
          members: couple.members.map(member => ({
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            profilePictureUrl: member.profilePicture?.url || null,
          })),
        })),
      }));
  
      ctx.body = groups;
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
  async generateMatches(ctx) {
    const { id, sets } = ctx.params;

    console.log(sets, 'setAmount');
    const setAmountInt = parseInt(sets, 10);
    if (isNaN(setAmountInt)) {
      return ctx.badRequest('Invalid set amount');
    }
  
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
  
        // if (couples.length !== 4) {
        //   throw new Error(`Group ${group.name} must have exactly 4 couples`);
        // }
  
        const groupMatchIds = [];
  
        // Generate all possible matches for this group
        for (let i = 0; i < couples.length; i++) {
          for (let j = i + 1; j < couples.length; j++) {
  
            // Create 4 sets for each couple
            const sets = [];
  
            for (let setNumber = 1; setNumber <= setAmountInt; setNumber++) {
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
              description: `${group.name} - ${couples[i].members[0].lastName} & ${couples[i].members[1].lastName} vs ${couples[j].members[0].lastName} & ${couples[j].members[1].lastName}`,
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
      ctx.throw(500, err.message)
    }
  },

  async createMatches(ctx) {
    const { tournamentId } = ctx.params;
  
    try {
      // Fetch the tournament by ID, and populate groups with couples and matches
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentId, {
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
  
        // if (couples.length !== 4) {
        //   throw new Error(`Group ${group.name} must have exactly 4 couples`);
        // }
  
        const groupMatchIds = [];
  
        // Generate all possible matches for this group
        for (let i = 0; i < couples.length; i++) {
          for (let j = i + 1; j < couples.length; j++) {
  
            // Create 4 sets for each couple
            const sets = [];
  
            for (let setNumber = 1; setNumber <= 3; setNumber++) {
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
              tournament: tournamentId,
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
      await strapi.entityService.update('api::tournament.tournament', tournamentId, {
        data: {
          groups: tournament.groups,
        },
      });
  
      ctx.body = { message: 'Matches generated and added to groups successfully', matches };
    } catch (err) {
      ctx.throw(500, err.message)
    }
  },
  
  async findMatchesWithCouples(ctx) {
    const { id } = ctx.params;

    try {
      // Fetch the tournament by ID, populate groups, matches, couples, members, and profile pictures
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
                            populate: {
                              formats: true,
                            },
                          },
                        },
                        fields: ['id', 'firstName', 'lastName'],
                      },
                      sets: {
                        populate: {
                          games: {
                            fields: ['gamesWon'], // optional deeper populate
                          },
                        },
                      },
                    },
                    fields: ['score', 'points'], // 🛠 Add fields to get `score` (and points if you want)
                  },
                },
              },
            },
          },
        },
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
            score: couple.score ?? [0, 0, 0], // 🛠 Add score here (fallback if missing)
            members: couple.members.map(member => ({
              id: member.id,
              firstName: member.firstName,
              lastName: member.lastName,
              profilePicture: member.profilePicture?.formats?.small?.url ||
                               member.profilePicture?.formats?.thumbnail?.url ||
        null,
            })),
            sets: couple.sets,
          })),
        })),
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

  async findGroupByMemberId(ctx) {
    const { tournamentId, memberId } = ctx.params;

    try {
      // Fetch tournament with full needed population
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentId, {
        populate: {
          groups: {
            populate: {
              couples: {
                populate: {
                  members: {
                    populate: {
                      profilePicture: {
                        populate: '*',
                      },
                    },
                    fields: ['id', 'firstName', 'lastName', 'email'], // Include email now
                  },
                },
              },
              matches: {
                populate: {
                  couples: {
                    populate: {
                      members: {
                        populate: {
                          profilePicture: {
                            populate: '*',
                          },
                        },
                        fields: ['id', 'firstName', 'lastName', 'email'], // Include email now
                      },
                      sets: true,
                      score: true, // 🛠 Include score properly
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!tournament) {
        ctx.throw(404, 'Tournament not found');
        return;
      }

      // Iterate over each group to find the member
      for (const group of tournament.groups) {
        for (const couple of group.couples) {
          const matchedMember = couple.members.find(member => member.id === parseInt(memberId, 10));

          if (matchedMember) {
            const otherMember = couple.members.find(member => member.id !== parseInt(memberId, 10));

            ctx.send({
              group: {
                id: group.id,
                name: group.name,
              },
              matches: group.matches.map(match => ({
                id: match.id,
                description: match.description,
                couples: match.couples.map(couple => ({
                  id: couple.id,
                  sets: couple.sets,
                  score: couple.score ?? [0, 0, 0], // 🛠 fallback to [0, 0, 0] if missing
                  points: couple.points,
                  members: couple.members.map(member => ({
                    id: member.id,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    email: member.email,
                    profilePicture: member.profilePicture?.formats?.small?.url ||
                                     member.profilePicture?.formats?.thumbnail?.url ||
                                     null,
                  })),
                })),
              })),
              matchedCouple: {
                id: couple.id,
                points: couple.points,
                otherMember: otherMember ? {
                  id: otherMember.id,
                  firstName: otherMember.firstName,
                  lastName: otherMember.lastName,
                  email: otherMember.email,
                } : null,
              },
            });
            return;
          }
        }
      }

      // If no match found, fallback to first group
      const firstGroup = tournament.groups[0];
      ctx.send({
        group: {
          id: firstGroup.id,
          name: firstGroup.name,
        },
        matches: firstGroup.matches.map(match => ({
          id: match.id,
          description: match.description,
          couples: match.couples.map(couple => ({
            id: couple.id,
            sets: couple.sets,
            score: couple.score ?? [0, 0, 0], // 🛠 fallback to [0, 0, 0] if missing
            points: couple.points,
            members: couple.members.map(member => ({
              id: member.id,
              firstName: member.firstName,
              lastName: member.lastName,
              email: member.email,
              profilePicture: member.profilePicture?.formats?.small?.url ||
                               member.profilePicture?.formats?.thumbnail?.url ||
                               null,
            })),
          })),
        })),
        matchedCouple: null,
      });

    } catch (error) {
      console.error('Error finding group by member ID:', error);
      ctx.throw(500, 'Failed to find the group by member ID.');
    }
  },


  async getTournamentResults(ctx) {
    const { tournamentId } = ctx.params;
  
    try {
      // Fetch the tournament and populate necessary fields
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentId, {
        populate: {
          groups: {
            populate: {
              couples: {
                populate: {
                  members: {
                    populate: {
                      profilePicture: {
                        populate: { formats: true },
                      },
                    },
                    fields: ['id', 'firstName', 'lastName'],
                  },
                },
              },
              matches: {
                populate: {
                  couples: {
                    populate: {
                      members: {
                        populate: {
                          profilePicture: {
                            populate: { formats: true },
                          },
                        },
                        fields: ['id', 'firstName', 'lastName'],
                      },
                      sets: true, // Populate sets
                    },
                  },
                },
              },
            },
          },
        },
      });
  
      if (!tournament) {
        ctx.throw(404, 'Tournament not found');
        return;
      }
  
      const coupleStats = {};
  
      // Initialize stats for all couples
      tournament.groups.forEach(group => {
        group.matches.forEach(match => {
          match.couples.forEach(couple => {
            const coupleKey = couple.members.map(member => member.id).sort().join('-');
  
            if (!coupleStats[coupleKey]) {
              coupleStats[coupleKey] = {
                members: couple.members,
                matchesWon: 0,
                gamesWon: 0,
                gamesLost: 0,
                setsWon: 0,
                setsLost: 0, // Initialize setsLost to 0
              };
            }
          });
        });
      });
  
      // Process each match to calculate stats
      for (const group of tournament.groups) {
        for (const match of group.matches) {
          if (match.couples.length < 2) continue;
  
          const coupleKeys = match.couples.map(couple => couple.members.map(member => member.id).sort().join('-'));
  
          const coupleResults = {
            [coupleKeys[0]]: { setsWon: 0, gamesWon: 0, gamesLost: 0, details: match.couples[0] },
            [coupleKeys[1]]: { setsWon: 0, gamesWon: 0, gamesLost: 0, details: match.couples[1] },
          };
  
          const setsCouple1 = match.couples[0].sets || [];
          const setsCouple2 = match.couples[1].sets || [];
  
          const totalSets = Math.min(setsCouple1.length, setsCouple2.length);
  
          for (let i = 0; i < totalSets; i++) {
            const set1 = setsCouple1[i];
            const set2 = setsCouple2[i];
          
            if (!set1 || !set2) continue; // Defensive guard
          
            // Track games won and lost
            coupleResults[coupleKeys[0]].gamesWon += set1.gamesWon;
            coupleResults[coupleKeys[0]].gamesLost += set2.gamesWon;
          
            coupleResults[coupleKeys[1]].gamesWon += set2.gamesWon;
            coupleResults[coupleKeys[1]].gamesLost += set1.gamesWon;
          
            // Track sets won and lost
            if (set1.gamesWon > set2.gamesWon) {
              coupleResults[coupleKeys[0]].setsWon += 1;
              coupleResults[coupleKeys[1]].setsLost += 1; // Increment setsLost for the losing couple
            } else if (set2.gamesWon > set1.gamesWon) {
              coupleResults[coupleKeys[1]].setsWon += 1;
              coupleResults[coupleKeys[0]].setsLost += 1; // Increment setsLost for the losing couple
            }
          }
  
          // Decide how many sets are needed to win
          const setsNeededToWin = totalSets === 1 ? 1 : 2;
  
          // Find winner
          const winningCouple = Object.values(coupleResults).find(result => result.setsWon >= setsNeededToWin);
  
          if (winningCouple) {
            const coupleKey = winningCouple.details.members.map(member => member.id).sort().join('-');
            coupleStats[coupleKey].matchesWon += 1;
          }
  
          // Update stats for both couples
          Object.keys(coupleResults).forEach(coupleKey => {
            coupleStats[coupleKey].gamesWon += coupleResults[coupleKey].gamesWon;
            coupleStats[coupleKey].gamesLost += coupleResults[coupleKey].gamesLost;
            coupleStats[coupleKey].setsWon += coupleResults[coupleKey].setsWon;
            coupleStats[coupleKey].setsLost += coupleResults[coupleKey].setsLost;
          });
        }
      }
  
      // Format the response
      const formattedResponse = Object.values(coupleStats).map(couple => ({
        couple: {
          members: couple.members.map(member => ({
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            profilePicture: member.profilePicture?.formats?.small?.url || member.profilePicture?.formats?.thumbnail?.url || null,
          })),
        },
        matchesWon: couple.matchesWon,
        gamesWon: couple.gamesWon,
        gamesLost: couple.gamesLost,
        gamesDifference: couple.gamesWon - couple.gamesLost,
        setsWon: couple.setsWon,
        setsLost: couple.setsLost,
        setsDifference: couple.setsWon - couple.setsLost, // Calculate setsDifference
      })).sort((a, b) => {
        // Sort by matchesWon (descending)
        if (b.matchesWon !== a.matchesWon) {
          return b.matchesWon - a.matchesWon;
        }
        // If matchesWon are tied, sort by setsWon (descending)
        if (b.setsWon !== a.setsWon) {
          return b.setsWon - a.setsWon;
        }

        if (b.gamesWon !== a.gamesWon) {
          return b.gamesWon - a.gamesWon
        }
        // If setsWon are tied, sort by gamesWon (descending)
        return b.gamesDifference - a.gamesDifference;
      });
  
      ctx.send(formattedResponse);
  
    } catch (error) {
      console.error('Error fetching tournament results:', error);
      ctx.throw(500, 'Failed to fetch tournament results.');
    }
  },


  async getTournamentGroupsResults(ctx) {
    const { tournamentId, memberId } = ctx.params;

    try {
        // Fetch the tournament and populate necessary fields
        const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentId, {
            populate: {
                groups: {
                    populate: {
                        couples: {
                            populate: {
                                members: {
                                    populate: {
                                        profilePicture: {
                                            populate: { formats: true },
                                        },
                                    },
                                    fields: ['id', 'firstName', 'lastName'],
                                },
                            },
                        },
                        matches: {
                            populate: {
                                couples: {
                                    populate: {
                                        members: {
                                            populate: {
                                                profilePicture: {
                                                    populate: { formats: true },
                                                },
                                            },
                                            fields: ['id', 'firstName', 'lastName'],
                                        },
                                        sets: true, // Populate sets
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!tournament) {
            ctx.throw(404, 'Tournament not found');
            return;
        }

        // Find the group that contains the member
        let group = tournament.groups.find(group =>
            group.couples.some(couple =>
                couple.members.some(member => member.id === parseInt(memberId, 10))
            )
        );

        // Default to the first group if no group is found
        if (!group) {
            group = tournament.groups[0];
            if (!group) {
                ctx.throw(404, 'No groups found in the tournament');
                return;
            }
        }

        const coupleStats = {};

        // Initialize stats for all couples in the group
        group.matches.forEach(match => {
            match.couples.forEach(couple => {
                const coupleKey = couple.members.map(member => member.id).sort().join('-');

                if (!coupleStats[coupleKey]) {
                    coupleStats[coupleKey] = {
                        members: couple.members,
                        matchesWon: 0,
                        gamesWon: 0,
                        gamesLost: 0,
                        setsWon: 0,
                        setsLost: 0,
                    };
                }
            });
        });

        // Process each match to calculate stats
        for (const match of group.matches) {
            if (match.couples.length < 2) continue;

            const coupleKeys = match.couples.map(couple => couple.members.map(member => member.id).sort().join('-'));

            const coupleResults = {
                [coupleKeys[0]]: { setsWon: 0, gamesWon: 0, gamesLost: 0, details: match.couples[0] },
                [coupleKeys[1]]: { setsWon: 0, gamesWon: 0, gamesLost: 0, details: match.couples[1] },
            };

            const setsCouple1 = match.couples[0].sets || [];
            const setsCouple2 = match.couples[1].sets || [];

            const totalSets = Math.min(setsCouple1.length, setsCouple2.length);

            for (let i = 0; i < totalSets; i++) {
                const set1 = setsCouple1[i];
                const set2 = setsCouple2[i];

                if (!set1 || !set2) continue;

                // Track games won and lost
                coupleResults[coupleKeys[0]].gamesWon += set1.gamesWon;
                coupleResults[coupleKeys[0]].gamesLost += set2.gamesWon;

                coupleResults[coupleKeys[1]].gamesWon += set2.gamesWon;
                coupleResults[coupleKeys[1]].gamesLost += set1.gamesWon;

                // Track sets won and lost
                if (set1.gamesWon > set2.gamesWon) {
                    coupleResults[coupleKeys[0]].setsWon += 1;
                    coupleResults[coupleKeys[1]].setsLost += 1;
                } else if (set2.gamesWon > set1.gamesWon) {
                    coupleResults[coupleKeys[1]].setsWon += 1;
                    coupleResults[coupleKeys[0]].setsLost += 1;
                }
            }

            // Decide how many sets are needed to win
            const setsNeededToWin = totalSets === 1 ? 1 : 2;

            // Find winner
            const winningCouple = Object.values(coupleResults).find(result => result.setsWon >= setsNeededToWin);

            if (winningCouple) {
                const coupleKey = winningCouple.details.members.map(member => member.id).sort().join('-');
                coupleStats[coupleKey].matchesWon += 1;
            }

            // Update stats for both couples
            Object.keys(coupleResults).forEach(coupleKey => {
                coupleStats[coupleKey].gamesWon += coupleResults[coupleKey].gamesWon;
                coupleStats[coupleKey].gamesLost += coupleResults[coupleKey].gamesLost;
                coupleStats[coupleKey].setsWon += coupleResults[coupleKey].setsWon;
                coupleStats[coupleKey].setsLost += coupleResults[coupleKey].setsLost;
            });
        }

        // Format the group results
        const formattedCouples = Object.values(coupleStats).map(couple => ({
            couple: {
                members: couple.members.map(member => ({
                    id: member.id,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    profilePicture: member.profilePicture?.formats?.small?.url || member.profilePicture?.formats?.thumbnail?.url || null,
                })),
            },
            matchesWon: couple.matchesWon,
            gamesWon: couple.gamesWon,
            gamesLost: couple.gamesLost,
            gamesDifference: couple.gamesWon - couple.gamesLost,
            setsWon: couple.setsWon,
            setsLost: couple.setsLost,
            setsDifference: couple.setsWon - couple.setsLost,
        })).sort((a, b) => {
            // Sort by matchesWon (descending)
            if (b.matchesWon !== a.matchesWon) {
                return b.matchesWon - a.matchesWon;
            }
            // If matchesWon are tied, sort by setsWon (descending)
            if (b.setsWon !== a.setsWon) {
                return b.setsWon - a.setsWon;
            }
            // If setsWon are tied, sort by gamesWon (descending)
            return b.gamesWon - a.gamesWon;
        });

        ctx.send({
            group: {
                id: group.id,
                name: group.name,
            },
            results: formattedCouples,
        });
    } catch (error) {
        console.error('Error fetching tournament group results:', error);
        ctx.throw(500, 'Failed to fetch tournament group results.');
    }
},

  async checkLoginStatus(ctx) {
    try {
      // Fetch all users
      const users = await strapi.query('plugin::users-permissions.user').findMany({
        populate: ['document'], // Assuming document is part of the user model
      });

      const invalidUsers = [];

      // Token for authorization
      const token = '04b4bf677234667eda880a51ef1858959fde491a5a007bf9f00be1060271013bcfbee19c644923e1766f9a77e6cf9d2ac6e57a559bdfec9015425bdcbf89b556b5a971f7d4a6eaf0ce0ea423660fe3793afea05bf8328eb4f3e4fb20d381e6b79e2138fcb1b9000574e72dbe873c1f0698e76a016f19451185c6a4bc43f795fc';

      // Iterate through each user and try to log in
      for (const user of users) {
        try {
          // Make a login request using the email and document (acting as password)
          const response = await axios.post('https://goldfish-app-25h3o.ondigitalocean.app/api/auth/local', {
            identifier: user.email, // Email is the identifier
            password: user.document, // Document is used as the password
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`, // Bearer token for authorization
            }
          });

          // Check if a JWT token is returned
          if (!response.data.jwt) {
            throw new Error('No JWT token returned');
          }
        } catch (error) {
          // If login fails, add the user to the invalidUsers array
          invalidUsers.push({
            id: user.id,
            email: user.email,
            document: user.document,
            name: user.username, // Assuming username exists, replace as needed
          });
        }
      }

      // Return users who couldn't log in
      if (invalidUsers.length > 0) {
        ctx.send({
          message: `${invalidUsers.length} users cannot log in.`,
          invalidUsers,
        });
      } else {
        ctx.send({ message: 'All users can log in successfully.' });
      }
    } catch (error) {
      console.error('Error checking login status:', error);
      ctx.throw(500, 'An error occurred while checking login statuses.');
    }
  },

  async generateKnockoutMatches(ctx) {
    const { tournamentId } = ctx.params;  // Get the tournament ID from the URL params
  
    try {
      // Fetch the tournament with groups, couples, members, and matches populated
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentId, {
        populate: {
          groups: {
            populate: {
              couples: {
                populate: {
                  members: {
                    populate: {
                      profilePicture: {
                        populate: {
                          formats: true,
                        }
                      }
                    },
                    fields: ['id', 'firstName', 'lastName'],
                  },
                },
              },
              matches: {
                populate: {
                  couples: {
                    populate: {
                      members: {
                        populate: {
                          profilePicture: {
                            populate: {
                              formats: true,
                            }
                          }
                        },
                        fields: ['id', 'firstName', 'lastName'],
                      },
                      sets: true, // Ensure sets are populated
                    },
                  },
                },
              },
            },
          },
        },
      });
  
      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }
  
      const goldenCupQuarterfinals = [];
      const silverCupQuarterfinals = [];
  
      // Function to calculate the number of sets won by a couple
      const calculateSetsWon = (couple, match) => {
        let setsWon = 0;
  
        // Check each set in the match for the couple
        couple.sets.forEach(set => {
          if (set.gamesWon >= 6) {
            setsWon += 1; // Couple won this set
          }
        });
  
        return setsWon;
      };
  
      // Function to calculate the number of matches won by a couple
      const calculateMatchesWon = (couple, group) => {
        let matchesWon = 0;
  
        // Iterate over each match in the group
        group.matches.forEach(match => {
          const matchResults = {};
  
          match.couples.forEach(matchCouple => {
            const coupleKey = matchCouple.members.map(member => member.id).sort().join('-');
            matchResults[coupleKey] = {
              setsWon: calculateSetsWon(matchCouple, match), // Calculate sets won for the couple
              details: matchCouple,
            };
          });
  
          // Determine the winner of the match (first couple to win at least 1 set)
          const matchWinner = Object.values(matchResults).find(result => result.setsWon >= 1);
  
          // If the couple is the match winner, increment the matchesWon count
          if (matchWinner && matchWinner.details.members.map(member => member.id).sort().join('-') === couple.members.map(member => member.id).sort().join('-')) {
            matchesWon += 1;
          }
        });
  
        return matchesWon;
      };
  
      // Iterate over each group to calculate matches won and sort couples
      const groups = tournament.groups;
  
      for (const group of groups) {
        if (!group || !group.couples || !Array.isArray(group.couples)) {
          console.error('Error: Missing or invalid group or couples data', group);
          continue;
        }
  
        // Add matches won to each couple based on sets and games won
        group.couples.forEach(couple => {
          couple.points = calculateMatchesWon(couple, group);
        });
  
        // Sort couples by matches won (descending order)
        const sortedCouples = group.couples.sort((a, b) => b.points - a.points);
  
        if (sortedCouples.length < 4) {
          console.error('Error: Not enough couples in group', group.name);
          continue;
        }
  
        // Get 1st, 2nd, 3rd, and 4th place couples
        const firstPlace = sortedCouples[0];
        const secondPlace = sortedCouples[1];
        const thirdPlace = sortedCouples[2];
        const fourthPlace = sortedCouples[3];
  
        // Assign couples to quarterfinals based on their group and place using group index
        if (groups.indexOf(group) === 0) { // Zona A
          goldenCupQuarterfinals.push({ team1: firstPlace, team2: secondPlace });
          silverCupQuarterfinals.push({ team1: thirdPlace, team2: fourthPlace });
        } else if (groups.indexOf(group) === 1) { // Zona B
          goldenCupQuarterfinals.push({ team1: firstPlace, team2: secondPlace });
          silverCupQuarterfinals.push({ team1: thirdPlace, team2: fourthPlace });
        } else if (groups.indexOf(group) === 2) { // Zona C
          goldenCupQuarterfinals.push({ team1: firstPlace, team2: secondPlace });
          silverCupQuarterfinals.push({ team1: thirdPlace, team2: fourthPlace });
        } else if (groups.indexOf(group) === 3) { // Zona D
          goldenCupQuarterfinals.push({ team1: firstPlace, team2: secondPlace });
          silverCupQuarterfinals.push({ team1: thirdPlace, team2: fourthPlace });
        }
      }
  
      // Now assign matches between groups for Golden Cup and Silver Cup quarterfinals
      const goldenCupMatches = [
        { team1: goldenCupQuarterfinals[0].team1, team2: goldenCupQuarterfinals[2].team2 },  // 1st Group A vs 2nd Group C
        { team1: goldenCupQuarterfinals[1].team1, team2: goldenCupQuarterfinals[3].team2 },  // 1st Group B vs 2nd Group D
        { team1: goldenCupQuarterfinals[2].team1, team2: goldenCupQuarterfinals[0].team2 },  // 1st Group C vs 2nd Group A
        { team1: goldenCupQuarterfinals[3].team1, team2: goldenCupQuarterfinals[1].team2 },  // 1st Group D vs 2nd Group B
      ];
  
      const silverCupMatches = [
        { team1: silverCupQuarterfinals[0].team1, team2: silverCupQuarterfinals[2].team2 },  // 3rd Group A vs 4th Group C
        { team1: silverCupQuarterfinals[1].team1, team2: silverCupQuarterfinals[3].team2 },  // 3rd Group B vs 4th Group D
        { team1: silverCupQuarterfinals[2].team1, team2: silverCupQuarterfinals[0].team2 },  // 3rd Group C vs 4th Group A
        { team1: silverCupQuarterfinals[3].team1, team2: silverCupQuarterfinals[1].team2 },  // 3rd Group D vs 4th Group B
      ];
  
      // Create Golden Cup Matches
      const goldenCupMatchesIds = [];
      for (const match of goldenCupMatches) {
        if (!match.team1 || !match.team2) {
          continue;
        }
  
        // Create 3 sets for each match
        const sets = [];
        for (let setNumber = 1; setNumber <= 3; setNumber++) {
          sets.push({ gamesWon: 0 });  // Initialize gamesWon with 0
        }
  
        const matchData = {
          match_owner: match.team1.members[0].id,
          couples: [
            {
              id: match.team1.id,  // Add team1 couple
              members: [
                { id: match.team1.members[0].id },
                { id: match.team1.members[1].id }
              ],
              sets: sets  // Assign the created sets to team1
            },
            {
              id: match.team2.id,  // Add team2 couple
              members: [
                { id: match.team2.members[0].id },
                { id: match.team2.members[1].id }
              ],
              sets: sets  // Assign the created sets to team2
            }
          ],
          cup_type: 'Golden',
          description: `Golden Cup Quarterfinal - ${match.team1.members[0].lastName} & ${match.team1.members[1].lastName} vs ${match.team2.members[0].lastName} & ${match.team2.members[1].lastName}`,
          date: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
          member_1: match.team1.members[0].id,
          member_2: match.team1.members[1].id,
          member_3: match.team2.members[0].id,
          member_4: match.team2.members[1].id,
        };
  
        const newMatch = await strapi.entityService.create('api::match.match', { data: matchData });
        goldenCupMatchesIds.push(newMatch.id);
      }
  
      // Create Silver Cup Matches
      const silverCupMatchesIds = [];
      for (const match of silverCupMatches) {
        if (!match.team1 || !match.team2) {
          continue;
        }
  
        // Create 3 sets for each match
        const sets = [];
        for (let setNumber = 1; setNumber <= 3; setNumber++) {
          sets.push({ gamesWon: 0 });  // Initialize gamesWon with 0
        }
  
        const matchData = {
          match_owner: match.team1.members[0].id,
          couples: [
            {
              id: match.team1.id,  // Add team1 couple
              members: [
                { id: match.team1.members[0].id },
                { id: match.team1.members[1].id }
              ],
              sets: sets  // Assign the created sets to team1
            },
            {
              id: match.team2.id,  // Add team2 couple
              members: [
                { id: match.team2.members[0].id },
                { id: match.team2.members[1].id }
              ],
              sets: sets  // Assign the created sets to team2
            }
          ],
          cup_type: 'Silver',
          description: `Silver Cup Quarterfinal - ${match.team1.members[0].lastName} & ${match.team1.members[1].lastName} vs ${match.team2.members[0].lastName} & ${match.team2.members[1].lastName}`,
          date: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
          member_1: match.team1.members[0].id,
          member_2: match.team1.members[1].id,
          member_3: match.team2.members[0].id,
          member_4: match.team2.members[1].id,
        };
  
        const newMatch = await strapi.entityService.create('api::match.match', { data: matchData });
        silverCupMatchesIds.push(newMatch.id);
      }
  
      // Update the tournament with Golden and Silver Cup quarterfinal matches
      await strapi.entityService.update('api::tournament.tournament', tournamentId, {
        data: {
          golden_cup: {
            quarterfinals: goldenCupMatchesIds,
          },
          silver_cup: {
            quarterfinals: silverCupMatchesIds,
          },
        },
      });
  
      // Return response with a success message
      ctx.send({ message: 'Golden Cup and Silver Cup quarterfinals generated successfully' });
    } catch (err) {
      console.error('Error generating quarterfinal matches:', err);
      ctx.throw(500, err.message);
    }
  },

  async generateSemifinalMatches(ctx) {
    const { tournamentId } = ctx.params;
  
    try {
      // Fetch the tournament with quarterfinals populated
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentId, {
        populate: {
          golden_cup: {
            populate: {
              quarterfinals: {
                populate: {
                  couples: {
                    populate: {
                      members: true,
                      sets: true,
                    },
                  },
                },
              },
            },
          },
          silver_cup: {
            populate: {
              quarterfinals: {
                populate: {
                  couples: {
                    populate: {
                      members: true,
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
        return ctx.notFound('Tournament not found');
      }
  
      const goldenCupSemifinals = [];
      const silverCupSemifinals = [];
  
      // Function to determine the winner of a match
      const determineMatchWinner = (match) => {
        const coupleResults = match.couples.map(couple => {
          let setsWon = couple.sets.reduce((acc, set) => acc + (set.gamesWon >= 6 ? 1 : 0), 0);
          return { couple, setsWon };
        });
  
        // Return the couple with the highest sets won
        return coupleResults.find(result => result.setsWon >= 1)?.couple || null;
      };
  
      // Iterate over the Golden Cup quarterfinals to generate semifinals
      for (let i = 0; i < tournament.golden_cup.quarterfinals.length; i += 2) {
        const match1 = tournament.golden_cup.quarterfinals[i];
        const match2 = tournament.golden_cup.quarterfinals[i + 1];
  
        const winner1 = determineMatchWinner(match1);
        const winner2 = determineMatchWinner(match2);
  
        if (winner1 && winner2) {
          // Create 3 sets for the semifinal match
          const sets = [];
          for (let setNumber = 1; setNumber <= 3; setNumber++) {
            sets.push({ gamesWon: 0 });
          }
  
          const matchData = {
            match_owner: winner1.members[0].id,
            couples: [
              {
                id: winner1.id,
                members: [
                  { id: winner1.members[0].id },
                  { id: winner1.members[1].id },
                ],
                sets: sets
              },
              {
                id: winner2.id,
                members: [
                  { id: winner2.members[0].id },
                  { id: winner2.members[1].id },
                ],
                sets: sets
              }
            ],
            cup_type: 'Golden',
            description: `Golden Cup Semifinal - ${winner1.members[0].lastName} & ${winner1.members[1].lastName} vs ${winner2.members[0].lastName} & ${winner2.members[1].lastName}`,
            date: new Date().toISOString(),
            publishedAt: new Date().toISOString(),
          };
  
          const semifinalMatch = await strapi.entityService.create('api::match.match', { data: matchData });
          goldenCupSemifinals.push(semifinalMatch.id);
        }
      }
  
      // Iterate over the Silver Cup quarterfinals to generate semifinals
      for (let i = 0; i < tournament.silver_cup.quarterfinals.length; i += 2) {
        const match1 = tournament.silver_cup.quarterfinals[i];
        const match2 = tournament.silver_cup.quarterfinals[i + 1];
  
        const winner1 = determineMatchWinner(match1);
        const winner2 = determineMatchWinner(match2);
  
        if (winner1 && winner2) {
          // Create 3 sets for the semifinal match
          const sets = [];
          for (let setNumber = 1; setNumber <= 3; setNumber++) {
            sets.push({ gamesWon: 0 });
          }
  
          const matchData = {
            match_owner: winner1.members[0].id,
            couples: [
              {
                id: winner1.id,
                members: [
                  { id: winner1.members[0].id },
                  { id: winner1.members[1].id },
                ],
                sets: sets
              },
              {
                id: winner2.id,
                members: [
                  { id: winner2.members[0].id },
                  { id: winner2.members[1].id },
                ],
                sets: sets
              }
            ],
            cup_type: 'Silver',
            description: `Silver Cup Semifinal - ${winner1.members[0].lastName} & ${winner1.members[1].lastName} vs ${winner2.members[0].lastName} & ${winner2.members[1].lastName}`,
            date: new Date().toISOString(),
            publishedAt: new Date().toISOString(),
          };
  
          const semifinalMatch = await strapi.entityService.create('api::match.match', { data: matchData });
          silverCupSemifinals.push(semifinalMatch.id);
        }
      }
  
      // Update the tournament with Golden and Silver Cup semifinal matches
      await strapi.entityService.update('api::tournament.tournament', tournamentId, {
        data: {
          golden_cup: {
            semifinals: goldenCupSemifinals,
          },
          silver_cup: {
            semifinals: silverCupSemifinals,
          },
        },
      });
  
      ctx.send({ message: 'Golden Cup and Silver Cup semifinals generated successfully' });
    } catch (err) {
      console.error('Error generating semifinal matches:', err);
      ctx.throw(500, err.message);
    }
  },


  async getSixteenMatches(ctx) {
    const { tournamentId } = ctx.params; // Get the tournament ID from the URL params
  
    try {
      // Fetch the tournament with Golden Cup "sixteen" matches populated
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentId, {
        populate: {
          golden_cup: {
            populate: {
              sixteen: {
                populate: {
                  couples: {
                    populate: {
                      members: {
                        populate: {
                          profilePicture: { populate: { formats: true } }
                        }
                      },
                      sets: true
                    },
                  },
                },
              },
            },
          },
          // If Silver Cup also has a "sixteen" stage, include it. If not, remove this section.
          // silver_cup: {
          //   populate: {
          //     sixteen: {
          //       populate: {
          //         couples: {
          //           populate: {
          //             members: {
          //               populate: {
          //                 profilePicture: { populate: { formats: true } }
          //               }
          //             },
          //             sets: true
          //           },
          //         },
          //       },
          //     },
          //   },
          // },
        },
      });
  
      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }
  
      // Helper function to format match results with couples and their sets
      const formatMatchResult = (match) => {
        const formattedCouples = match.couples.map(couple => ({
          coupleId: couple.id,
          members: couple.members.map(member => ({
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            profilePicture: member.profilePicture?.formats?.small?.url || null,
          })),
          sets: couple.sets ? couple.sets.map(set => ({
            setId: set.id,
            gamesWon: set.gamesWon,
          })) : [],
        }));
  
        return {
          id: match.id,
          description: match.description,
          couples: formattedCouples,
        };
      };
  
      const sixteenMatches = {
        goldenCupMatches: [],
        silverCupMatches: []
      };
  
      // If golden cup sixteen matches exist, format them
      if (tournament.golden_cup && tournament.golden_cup.sixteen) {
        sixteenMatches.goldenCupMatches = tournament.golden_cup.sixteen.map(formatMatchResult);
      }
  
      // If silver cup sixteen matches exist, uncomment and format them
      // if (tournament.silver_cup && tournament.silver_cup.sixteen) {
      //   sixteenMatches.silverCupMatches = tournament.silver_cup.sixteen.map(formatMatchResult);
      // }
  
      ctx.send(sixteenMatches);
  
    } catch (err) {
      console.error('Error fetching sixteen matches:', err);
      ctx.throw(500, 'Failed to fetch sixteen matches');
    }
  },
  

  async getQuarterfinalMatches(ctx) {
    const { tournamentId } = ctx.params;  // Get the tournament ID from the URL params
  
    try {
      // Fetch the tournament with Golden and Silver Cup quarterfinal matches populated
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentId, {
        populate: {
          golden_cup: {
            populate: {
              quarterfinals: {
                populate: {
                  couples: {
                    populate: {
                      members: {
                        populate: {
                          profilePicture: {
                            populate: { formats: true } // Populate profile picture formats
                          }
                        },
                      },
                      sets: true,    // Populate sets in couples
                    },
                  },
                },
              },
            },
          },
          silver_cup: {
            populate: {
              quarterfinals: {
                populate: {
                  couples: {
                    populate: {
                      members: {
                        populate: {
                          profilePicture: {
                            populate: { formats: true } // Populate profile picture formats
                          }
                        },
                      },
                      sets: true,    // Populate sets in couples
                    },
                  },
                },
              },
            },
          },
        },
      });
  
      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }
  
      // Helper function to format match results with couples and their sets
      const formatMatchResult = (match) => {
        const formattedCouples = match.couples.map(couple => ({
          coupleId: couple.id,
          members: couple.members.map(member => ({
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            profilePicture: member.profilePicture?.formats?.small?.url || null,
          })),
          sets: couple.sets ? couple.sets.map(set => ({
            setId: set.id,
            gamesWon: set.gamesWon,
          })) : [],
        }));
  
        return {
          id: match.id,
          description: match.description,
          couples: formattedCouples
        };
      };
  
      const quarterfinalMatches = {
        goldenCupMatches: [],
        silverCupMatches: []
      };
  
      // If golden cup quarterfinals exist, format them
      if (tournament.golden_cup && tournament.golden_cup.quarterfinals) {
        quarterfinalMatches.goldenCupMatches = tournament.golden_cup.quarterfinals.map(formatMatchResult);
      }
  
      // If silver cup quarterfinals exist, format them
      if (tournament.silver_cup && tournament.silver_cup.quarterfinals) {
        quarterfinalMatches.silverCupMatches = tournament.silver_cup.quarterfinals.map(formatMatchResult);
      }
  
      // Send the results back to the client
      ctx.send(quarterfinalMatches);
  
    } catch (err) {
      console.error('Error fetching quarterfinal matches:', err);
      ctx.throw(500, 'Failed to fetch quarterfinal matches');
    }
  },

  
  async getSemifinalMatches(ctx) {
    const { tournamentId } = ctx.params; // Get the tournament ID from the URL params
  
    try {
      // Fetch the tournament with Golden and Silver Cup semifinal matches populated
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentId, {
        populate: {
          golden_cup: {
            populate: {
              semifinals: {
                populate: {
                  couples: {
                    populate: {
                      members: {
                        populate: {
                          profilePicture: { populate: { formats: true } }
                        }
                      },
                      sets: true,
                    },
                  },
                },
              },
            },
          },
          silver_cup: {
            populate: {
              semifinals: {
                populate: {
                  couples: {
                    populate: {
                      members: {
                        populate: {
                          profilePicture: { populate: { formats: true } }
                        }
                      },
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
        return ctx.notFound('Tournament not found');
      }
  
      const formatMatchResult = (match) => {
        const formattedCouples = match.couples.map(couple => ({
          coupleId: couple.id,
          members: couple.members.map(member => ({
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            profilePicture: member.profilePicture?.formats?.small?.url || null,
          })),
          sets: couple.sets ? couple.sets.map(set => ({
            setId: set.id,
            gamesWon: set.gamesWon,
          })) : [],
        }));
  
        return {
          id: match.id,
          description: match.description,
          couples: formattedCouples,
        };
      };
  
      const semifinalMatches = {
        goldenCupSemifinals: [],
        silverCupSemifinals: []
      };
  
      if (tournament.golden_cup && tournament.golden_cup.semifinals) {
        semifinalMatches.goldenCupSemifinals = tournament.golden_cup.semifinals.map(formatMatchResult);
      }
  
      if (tournament.silver_cup && tournament.silver_cup.semifinals) {
        semifinalMatches.silverCupSemifinals = tournament.silver_cup.semifinals.map(formatMatchResult);
      }
  
      ctx.send(semifinalMatches);
  
    } catch (err) {
      console.error('Error fetching semifinal matches:', err);
      ctx.throw(500, 'Failed to fetch semifinal matches');
    }
  },
  
  
  async getFinalMatch(ctx) {
    const { tournamentId } = ctx.params; // Get the tournament ID from the URL params
  
    try {
      // Fetch the tournament with Golden and Silver Cup final matches populated
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentId, {
        populate: {
          golden_cup: {
            populate: {
              final: {
                populate: {
                  couples: {
                    populate: {
                      members: {
                        populate: {
                          profilePicture: { populate: { formats: true } }
                        }
                      },
                      sets: true,
                    },
                  },
                },
              },
            },
          },
          silver_cup: {
            populate: {
              final: {
                populate: {
                  couples: {
                    populate: {
                      members: {
                        populate: {
                          profilePicture: { populate: { formats: true } }
                        }
                      },
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
        return ctx.notFound('Tournament not found');
      }
  
      const formatMatchResult = (match) => {
        const formattedCouples = match.couples.map(couple => ({
          coupleId: couple.id,
          members: couple.members.map(member => ({
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            profilePicture: member.profilePicture?.formats?.small?.url || null,
          })),
          sets: couple.sets ? couple.sets.map(set => ({
            setId: set.id,
            gamesWon: set.gamesWon,
          })) : [],
        }));
  
        return {
          id: match.id,
          description: match.description,
          couples: formattedCouples,
        };
      };
  
      const finalMatches = {
        goldenCupFinal: [],
        silverCupFinal: []
      };
  
      if (tournament.golden_cup && tournament.golden_cup.final) {
        // In some configurations, final might be a single object rather than an array.
        // Ensure it's treated as an array for consistency:
        const goldenFinalMatches = Array.isArray(tournament.golden_cup.final) ? tournament.golden_cup.final : [tournament.golden_cup.final];
        finalMatches.goldenCupFinal = goldenFinalMatches.map(formatMatchResult);
      }
  
      if (tournament.silver_cup && tournament.silver_cup.final) {
        const silverFinalMatches = Array.isArray(tournament.silver_cup.final) ? tournament.silver_cup.final : [tournament.silver_cup.final];
        finalMatches.silverCupFinal = silverFinalMatches.map(formatMatchResult);
      }
  
      ctx.send(finalMatches);
  
    } catch (err) {
      console.error('Error fetching final matches:', err);
      ctx.throw(500, 'Failed to fetch final matches');
    }
  },

  async generateGoldenCupKnockoutMatches(ctx) {
    const { tournamentId } = ctx.params;
  
    try {
      // Fetch the tournament with groups and couples populated
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentId, {
        populate: {
          groups: {
            populate: {
              couples: {
                populate: {
                  members: {
                    populate: {
                      profilePicture: {
                        populate: { formats: true },
                      },
                    },
                    fields: ['id', 'firstName', 'lastName'],
                  },
                  sets: true, // Populate sets for calculating points
                },
              },
            },
          },
        },
      });
  
      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }
  
      const groups = tournament.groups;
  
      const quarterfinals = [];
      const semifinalists = [];
  
      // Helper function to calculate points using calculateSetsWon logic
      const calculateSetsWon = (couple) => {
        let setsWon = 0;
        couple.sets.forEach((set) => {
          if (set.gamesWon >= 6) {
            setsWon += 1;
          }
        });
        return setsWon;
      };
  
      // Process each group to determine quarterfinalists and semifinalists
      for (const group of groups) {
        if (!group || !group.couples) continue;
  
        // Calculate points for each couple
        group.couples.forEach((couple) => {
          couple.points = calculateSetsWon(couple);
        });
  
        // Sort couples by points in descending order
        group.couples.sort((a, b) => b.points - a.points);
  
        // Add 2nd and 3rd place couples to quarterfinals
        if (group.couples[1] && group.couples[2]) {
          quarterfinals.push({
            team1: group.couples[1],
            team2: group.couples[2],
          });
        }
  
        // Add 1st place couple to semifinalists
        if (group.couples[0]) {
          semifinalists.push(group.couples[0]);
        }
      }
  
      // Create quarterfinal matches
      const quarterfinalMatchIds = [];
      for (const match of quarterfinals) {
        if (!match.team1 || !match.team2) continue;
  
        // Create 3 sets for each match
        const sets = [];
        for (let setNumber = 1; setNumber <= 3; setNumber++) {
          sets.push({ gamesWon: 0 });
        }
  
        const matchData = {
          match_owner: match.team1.members[0].id,
          couples: [
            {
              id: match.team1.id,
              members: match.team1.members.map((member) => ({ id: member.id })),
              sets: sets,
            },
            {
              id: match.team2.id,
              members: match.team2.members.map((member) => ({ id: member.id })),
              sets: sets,
            },
          ],
          cup_type: 'Golden',
          description: `Golden Cup Quarterfinal - ${match.team1.members[0].lastName} & ${match.team1.members[1].lastName} vs ${match.team2.members[0].lastName} & ${match.team2.members[1].lastName}`,
          date: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
        };
  
        const newMatch = await strapi.entityService.create('api::match.match', { data: matchData });
        quarterfinalMatchIds.push(newMatch.id);
      }
  
      // Create semifinal matches
      const semifinalMatchIds = [];
      for (let i = 0; i < semifinalists.length; i += 2) {
        if (!semifinalists[i] || !semifinalists[i + 1]) continue;
  
        // Create 3 sets for the semifinal match
        const sets = [];
        for (let setNumber = 1; setNumber <= 3; setNumber++) {
          sets.push({ gamesWon: 0 });
        }
  
        const matchData = {
          match_owner: semifinalists[i].members[0].id,
          couples: [
            {
              id: semifinalists[i].id,
              members: semifinalists[i].members.map((member) => ({ id: member.id })),
              sets: sets,
            },
            {
              id: semifinalists[i + 1].id,
              members: semifinalists[i + 1].members.map((member) => ({ id: member.id })),
              sets: sets,
            },
          ],
          cup_type: 'Golden',
          description: `Golden Cup Semifinal - ${semifinalists[i].members[0].lastName} & ${semifinalists[i].members[1].lastName} vs ${semifinalists[i + 1].members[0].lastName} & ${semifinalists[i + 1].members[1].lastName}`,
          date: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
        };
  
        const newMatch = await strapi.entityService.create('api::match.match', { data: matchData });
        semifinalMatchIds.push(newMatch.id);
      }
  
      // Update the tournament with the Golden Cup structure
      await strapi.entityService.update('api::tournament.tournament', tournamentId, {
        data: {
          golden_cup: {
            quarterfinals: quarterfinalMatchIds,
            semifinals: semifinalMatchIds,
          },
        },
      });
  
      ctx.send({ message: 'Golden Cup quarterfinals and semifinals generated successfully' });
    } catch (err) {
      console.error('Error generating Golden Cup matches:', err);
      ctx.throw(500, err.message);
    }
  },

  async assignTournamentToMatches(ctx) {
    const { tournamentId } = ctx.params;

    try {
      // Step 1: Fetch the tournament by ID and populate groups and matches within the groups
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentId, {
        populate: {
          groups: {
            populate: {
              matches: true, // Populate the matches within the groups
            },
          },
        },
      });

      // If tournament is not found, return a 404 error
      if (!tournament) {
        return ctx.notFound('Tournament not found');
      }

      // Step 2: Loop through all groups and their matches
      const groups = tournament.groups;
      if (!groups || groups.length === 0) {
        return ctx.send({ message: 'No groups found in this tournament' });
      }

      // Collect all matches from all groups
      let allMatches = [];
      groups.forEach(group => {
        if (group.matches && group.matches.length > 0) {
          allMatches = allMatches.concat(group.matches);
        }
      });

      if (allMatches.length === 0) {
        return ctx.send({ message: 'No matches found in the tournament groups' });
      }

      console.log('All matchesssssss:', allMatches);

      // Step 3: Update each match to assign the tournament ID
      await Promise.all(
        allMatches.map(async (match) => {
          await strapi.entityService.update('api::match.match', match.id, {
            data: {
              tournament: tournamentId, // Assign the tournament ID to the match
            },
          });
        })
      );

      // Step 4: Return success response
      ctx.send({
        message: `Tournament ID ${tournamentId} has been successfully added to all matches in the groups of the tournament`,
      });
    } catch (error) {
      console.error('Error assigning tournament to matches:', error);
      ctx.throw(500, 'Internal Server Error');
    }
  },


  async getTournamentLeaderboard(ctx) {
    const { tournamentId } = ctx.params;

    try {
      // Fetch the tournament and populate the necessary fields
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentId, {
        populate: {
          groups: {
            populate: {
              couples: {
                populate: {
                  members: {
                    populate: {
                      profilePicture: {
                        populate: {
                          formats: true,
                        }
                      }
                    },
                    fields: ['id', 'firstName', 'lastName'],
                  },
                  points: true,  // Fetch the points for each couple
                },
              },
            },
          },
        },
      });

      if (!tournament) {
        ctx.throw(404, 'Tournament not found');
        return;
      }

      const couplesWithPoints = [];

      // Iterate over each group and each couple to collect their points
      tournament.groups.forEach(group => {
        group.couples.forEach(couple => {
          // Create a formatted object for each couple including their members and points
          const coupleWithPoints = {
            couple: {
              members: couple.members.map(member => ({
                id: member.id,
                firstName: member.firstName,
                lastName: member.lastName,
                profilePicture: member.profilePicture?.formats?.small?.url || member.profilePicture?.formats?.thumbnail?.url|| null,
              })),
            },
            points: couple.points || 0, // Fetch points, default to 0 if not available
          };
          couplesWithPoints.push(coupleWithPoints);
        });
      });

      // Sort couples by their points in descending order
      const sortedCouplesWithPoints = couplesWithPoints.sort((a, b) => b.points - a.points);

      // Send the formatted response
      ctx.send(sortedCouplesWithPoints);

    } catch (error) {
      console.error('Error fetching tournament couples and points:', error);
      ctx.throw(500, 'Failed to fetch tournament couples and points.');
    }
  },

async getIndividualTournamentLeaderboard(ctx) {
  const { tournamentId } = ctx.params;

  try {
    // Fetch the tournament and populate the necessary fields for the ranking
    const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentId, {
      populate: {
        ranking: {
          populate: {
            player: {
              populate: {
                profilePicture: {
                  populate: {
                    formats: true,
                  },
                },
              },
              fields: ['id', 'firstName', 'lastName'],
            },
          },
        },
      },
    });

    if (!tournament) {
      ctx.throw(404, 'Tournament not found');
      return;
    }

    console.log('Tournament ranking:', tournament.ranking);

    const playersWithPoints = [];

    // Iterate over the ranking to collect individual player data
    tournament.ranking.forEach(entry => {
      if (entry.player) {
        // Create a formatted object for each player including their points
        const playerWithPoints = {
          player: {
            id: entry.player.id,
            firstName: entry.player.firstName,
            lastName: entry.player.lastName,
            profilePicture: entry.player.profilePicture?.formats?.small?.url || null,
          },
          points: entry.points || 0, // Fetch points, default to 0 if not available
        };
        playersWithPoints.push(playerWithPoints);
      }
    });

    // Sort players by their points in descending order
    const sortedPlayersWithPoints = playersWithPoints.sort((a, b) => b.points - a.points);

    // Send the formatted response
    ctx.send(sortedPlayersWithPoints);

  } catch (error) {
    console.error('Error fetching tournament players and points:', error);
    ctx.throw(500, 'Failed to fetch tournament players and points.');
  }
},


async deleteTournamentMatches(ctx) {
  const { id: tournamentId } = ctx.params; // Extract the tournament ID from the request params

  try {
    // Find all matches associated with the tournament
    const matches = await strapi.entityService.findMany('api::match.match', {
      filters: { tournament: tournamentId },
    });

    if (!matches || matches.length === 0) {
      return ctx.send({ message: 'No matches found for the specified tournament.' }, 200);
    }

    // Delete all the matches
    const deletedMatches = await Promise.all(
      matches.map(match => 
        strapi.entityService.delete('api::match.match', match.id)
      )
    );

    return ctx.send({ 
      message: `Successfully deleted ${deletedMatches.length} matches for tournament ID: ${tournamentId}.` 
    }, 200);

  } catch (error) {
    console.error('Error deleting matches:', error);
    ctx.throw(500, 'Failed to delete matches.');
  }
},

async generateGoldenCupMatches(ctx) {
  const { tournamentId } = ctx.params; // Extract the tournament ID from the request params

  try {
    // Fetch the tournament with groups and couples populated
    const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentId, {
      populate: {
        groups: {
          populate: {
            couples: {
              populate: {
                members: {
                  populate: {
                    profilePicture: {
                      populate: { formats: true }, // Populate profile picture formats
                    },
                  },
                  fields: ['id', 'firstName', 'lastName'],
                },
              },
              points: true, // Fetch points for sorting
            },
          },
        },
      },
    });

    if (!tournament) {
      return ctx.notFound('Tournament not found');
    }

    const sixteenFinalMatches = [];
    const quarterFinalMatches = [];

    // Process each group to generate matches
    for (const group of tournament.groups) {
      if (!group || !group.couples || group.couples.length < 3) {
        console.error(`Group ${group.name} does not have enough couples to generate matches.`);
        continue;
      }

      // Sort couples by points in descending order
      const sortedCouples = group.couples.sort((a, b) => (b.points || 0) - (a.points || 0));

      // Get first, second, and third place couples
      const firstPlace = sortedCouples[0];
      const secondPlace = sortedCouples[1];
      const thirdPlace = sortedCouples[2];

      // Generate a round of sixteen match (second vs third)
      if (secondPlace && thirdPlace) {
        const matchData = {
          match_owner: secondPlace.members[0].id,
          couples: [
            {
              id: secondPlace.id,
              members: secondPlace.members.map(member => ({
                id: member.id,
              })),
            },
            {
              id: thirdPlace.id,
              members: thirdPlace.members.map(member => ({
                id: member.id,
              })),
            },
          ],
          description: `Round of Sixteen: ${secondPlace.members[0].lastName} & ${secondPlace.members[1].lastName} vs ${thirdPlace.members[0].lastName} & ${thirdPlace.members[1].lastName}`,
          date: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
        };

        // Create the match and store the ID
        const createdMatch = await strapi.entityService.create('api::match.match', { data: matchData });
        sixteenFinalMatches.push(createdMatch.id);
      }

      // Generate a quarterfinal match (first vs empty couple)
      if (firstPlace) {
        const emptyCouple = {
          id: null, // Indicate an empty couple
          members: [],
        };

        const matchData = {
          match_owner: firstPlace.members[0].id,
          couples: [
            {
              id: firstPlace.id,
              members: firstPlace.members.map(member => ({
                id: member.id,
              })),
            },
            emptyCouple, // Add an empty couple
          ],
          description: `Quarterfinal: ${firstPlace.members[0].lastName} & ${firstPlace.members[1].lastName} vs TBD`,
          date: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
        };

        // Create the match and store the ID
        const createdMatch = await strapi.entityService.create('api::match.match', { data: matchData });
        quarterFinalMatches.push(createdMatch.id);
      }
    }

    // Update the tournament's golden cup with the generated matches
    await strapi.entityService.update('api::tournament.tournament', tournamentId, {
      data: {
        golden_cup: {
          sixteen: sixteenFinalMatches,
          quarterfinals: quarterFinalMatches,
        },
      },
    });

    ctx.send({
      message: 'Golden Cup matches (round of sixteen and quarterfinals) generated successfully.',
      sixteenFinalMatches,
      quarterFinalMatches,
    });
  } catch (err) {
    console.error('Error generating Golden Cup matches:', err);
    ctx.throw(500, 'Failed to generate Golden Cup matches.');
  }
},

async getTest (ctx) {
  ctx.send('Testing!')
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
          if (couple.sets.length > 1) {
            // Remove all sets after the first one
            couple.sets = couple.sets.slice(0, 1); // Keep only the first set
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

    console.log('Successfully removed the extra sets from all matches.');
  } catch (error) {
    console.error('Error removing extra sets from matches:', error);
  }
}

