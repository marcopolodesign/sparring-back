const { createCoreController } = require('@strapi/strapi').factories;
const axios = require('axios');

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
                            populate: {
                              formats: true
                            }
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
              profilePicture: member.profilePicture?.formats?.small?.url || null,
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

  async findGroupByMemberId(ctx) {
    const { tournamentId, memberId } = ctx.params;

    try {
      // Fetch the tournament by ID and populate groups, couples, members, and matches
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentId, {
        populate: {
          groups: {
            populate: {
              couples: {
                populate: {
                  members: {
                    populate: {
                      profilePicture: {
                        populate: '*',  // Ensure all fields under profilePicture are populated
                      },
                    },
                    fields: ['id', 'firstName', 'lastName'], // Select specific fields to populate
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
                            populate: '*',  // Ensure all fields under profilePicture are populated
                          },
                        },
                        fields: ['id', 'firstName', 'lastName'], // Select specific fields to populate
                      },
                      sets: true, // Populate sets within each couple
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

      // Iterate over each group to find the matching member ID
      for (const group of tournament.groups) {
        for (const couple of group.couples) {
          // Check if the member ID is in the couple's members
          const matchedMember = couple.members.find(member => member.id === parseInt(memberId, 10));

          if (matchedMember) {
            // Find the member in the couple who does not match the provided memberId
            const otherMember = couple.members.find(member => member.id !== parseInt(memberId, 10));

            // If a match is found, return the group, its matches, and the other member of the matched couple
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
                  points: couple.points,
                  members: couple.members.map(member => ({
                    id: member.id,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    email: member.email,
                    profilePicture: member.profilePicture?.formats?.small?.url || null,
                  })),
                })),
              })),
              matchedCouple: {
                id: couple.id,
                points: couple.points,
                otherMember: {
                  id: otherMember.id,
                  firstName: otherMember.firstName,
                  lastName: otherMember.lastName,
                  email: otherMember.email,
                },
              },
            });
            return;
          }
        }
      }

      // If no match was found, return a message
      ctx.send({ message: 'No match found for the provided member ID.' });

    } catch (error) {
      console.error('Error finding group by member ID:', error);
      ctx.throw(500, 'Failed to find the group by member ID.');
    }
  },

  async getTournamentResults(ctx) {
    const { tournamentId } = ctx.params;
  
    try {
      // Fetch all matches in the tournament, populating necessary fields
      const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentId, {
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
                            }
                          }
                        },
                        fields: ['id', 'firstName', 'lastName'],
                      },
                      sets: true, // Populate sets within each couple
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
  
      const coupleWins = {};
  
      // Initialize all couples with 0 matches won
      tournament.groups.forEach(group => {
        group.matches.forEach(match => {
          match.couples.forEach(couple => {
            // Create a unique key for each couple based on member IDs
            const coupleKey = couple.members.map(member => member.id).sort().join('-');
  
            if (!coupleWins[coupleKey]) {
              coupleWins[coupleKey] = {
                members: couple.members,
                matchesWon: 0,
              };
            }
          });
        });
      });
  
      // Iterate over each group and each match to calculate matches won
      for (const group of tournament.groups) {
        for (const match of group.matches) {
          const coupleResults = {};
  
          // Iterate over each couple in the match
          match.couples.forEach(couple => {
            let setsWon = 0;
  
            // Determine the winner of each set for this couple
            couple.sets.forEach(set => {
              if (set.gamesWon >= 6) {
                setsWon += 1; // Count the set as won if they have 6 or more games won
              }
            });
  
            const coupleKey = couple.members.map(member => member.id).sort().join('-');
  
            coupleResults[coupleKey] = {
              setsWon,
              details: couple,
            };
          });
  
          // Determine the winner of the match (first couple to win 1 set)
          const matchWinner = Object.values(coupleResults).find(result => result.setsWon >= 1);
          if (matchWinner) {
            const coupleKey = matchWinner.details.members.map(member => member.id).sort().join('-');
            coupleWins[coupleKey].matchesWon += 1;
          }
        }
      }
  
      // Format the response to include only necessary member fields
      const formattedResponse = Object.values(coupleWins).map(couple => {
        return {
          couple: {
            members: couple.members.map(member => ({
              id: member.id,
              firstName: member.firstName,
              lastName: member.lastName,
              profilePicture: member.profilePicture?.formats?.small?.url || null,
            })),
          },
          matchesWon: couple.matchesWon,
        };
      }).sort((a, b) => b.matchesWon - a.matchesWon); // Sort by matches won in descending order
  
      ctx.send(formattedResponse);
  
    } catch (error) {
      console.error('Error fetching tournament results:', error);
      ctx.throw(500, 'Failed to fetch tournament results.');
    }
  },

  async getGroupResults(ctx) {
    const { tournamentId, memberId } = ctx.params;
  
    try {
      // Fetch the tournament by ID and populate groups, couples, members, and matches
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
                        },
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
                            populate: {
                              formats: true,
                            },
                          },
                        },
                        fields: ['id', 'firstName', 'lastName'],
                      },
                      sets: true, // Populate sets within each couple
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
  
      let matchedGroup = null;
  
      // Find the group where the member is participating
      for (const group of tournament.groups) {
        for (const couple of group.couples) {
          const matchedMember = couple.members.find(member => member.id === parseInt(memberId, 10));
  
          if (matchedMember) {
            matchedGroup = group;
            break;
          }
        }
        if (matchedGroup) break;
      }
  
      if (!matchedGroup) {
        ctx.send({ message: 'No match found for the provided member ID.' });
        return;
      }
  
      // Initialize an empty object to track couple wins
      const coupleWins = {};
  
      // Initialize all couples in the group with 0 matches won
      matchedGroup.matches.forEach(match => {
        match.couples.forEach(couple => {
          const coupleKey = couple.members.map(member => member.id).sort().join('-');
  
          if (!coupleWins[coupleKey]) {
            coupleWins[coupleKey] = {
              members: couple.members,
              matchesWon: 0,
            };
          }
        });
      });
  
      // Calculate which couple won each match
      for (const match of matchedGroup.matches) {
        let matchWinner = null;
  
        // Iterate over each couple in the match
        const coupleResults = {};
  
        match.couples.forEach(couple => {
          let setsWon = 0;
  
          // Iterate through each set and check if the couple has won by reaching 6 games
          couple.sets.forEach(set => {
            if (set.gamesWon >= 6) {
              setsWon += 1; // Count the set as won if the couple reached 6 games
            }
          });
  
          const coupleKey = couple.members.map(member => member.id).sort().join('-');
  
          coupleResults[coupleKey] = {
            setsWon,
            details: couple,
          };
        });
  
        // Determine the match winner (the couple that wins at least 1 set)
        const winningCouple = Object.values(coupleResults).find(result => result.setsWon >= 1);
  
        if (winningCouple) {
          const coupleKey = winningCouple.details.members.map(member => member.id).sort().join('-');
          coupleWins[coupleKey].matchesWon += 1; // Increment the match win count for the winning couple
        }
      }
  
      // Format the response to include necessary member fields
      const formattedResponse = Object.values(coupleWins).map(couple => ({
        couple: {
          members: couple.members.map(member => ({
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            profilePicture: member.profilePicture?.formats?.small?.url || null,
          })),
        },
        matchesWon: couple.matchesWon,
      })).sort((a, b) => b.matchesWon - a.matchesWon);  // Sort by matches won in descending order
  
      // Send the final result back in the response
      ctx.send({
        group: {
          id: matchedGroup.id,
          name: matchedGroup.name,
        },
        results: formattedResponse,
      });
  
    } catch (error) {
      console.error('Error fetching group results:', error);
      ctx.throw(500, 'Failed to fetch group results.');
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
    const {  tournamentId } = ctx.params;  // Get the tournament ID from the URL params

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

      // Function to calculate the number of matches won by a couple based on sets and games won
      const calculateMatchesWon = (couple, group) => {
        let matchesWon = 0;

        // Iterate over each match in the group
        group.matches.forEach(match => {
          const matchResults = {};

          match.couples.forEach(matchCouple => {
            let setsWon = 0;

            // Iterate over sets to check if the couple won at least 6 games in the set
            matchCouple.sets.forEach(set => {
              if (set.gamesWon >= 6) {
                setsWon += 1;
              }
            });

            const coupleKey = matchCouple.members.map(member => member.id).sort().join('-');
            matchResults[coupleKey] = {
              setsWon,
              details: matchCouple,
            };
          });

          // Determine the winner of the match (first couple to win 2 sets)
          const matchWinner = Object.values(matchResults).find(result => result.setsWon >= 2);

          // If the couple is the match winner, increment the matchesWon count
          if (matchWinner && matchWinner.details.members.map(member => member.id).sort().join('-') === couple.members.map(member => member.id).sort().join('-')) {
            matchesWon += 1;
          }
        });

        return matchesWon;
      };

      // Iterate over each group to calculate matches won and sort couples
      for (const group of tournament.groups) {
        // Defensive check for group and couples
        if (!group || !group.couples || !Array.isArray(group.couples)) {
          console.error('Error: Missing or invalid group or couples data', group);
          continue;  // Skip to the next group if invalid
        }

        // Add matches won to each couple based on sets and games won
        group.couples.forEach(couple => {
          couple.points = calculateMatchesWon(couple, group);
          // console.log(`Couple ${couple.id} matches won: ${couple.points}`);
        });

        // Sort couples by matches won (descending order)
        const sortedCouples = group.couples.sort((a, b) => b.points - a.points);
        // console.log('Sorted couples:', sortedCouples);

        // Defensive check for sorting results
        if (sortedCouples.length < 4) {
          console.error('Error: Not enough couples in group', group.name);
          continue;  // Skip to the next group if not enough couples
        }

        // Get 1st, 2nd, 3rd, and 4th place couples
        const firstPlace = sortedCouples[0];
        const secondPlace = sortedCouples[1];
        const thirdPlace = sortedCouples[2];
        const fourthPlace = sortedCouples[3];


        // Defensive check for couple IDs
        if (!firstPlace || !secondPlace || !thirdPlace || !fourthPlace) {
          console.error('Error: Missing couple data in group', group.name);
          continue;  // Skip to the next group if any couple is missing
        }

        // Assign couples to quarterfinals based on their group and place
        if (group.name === 'Grupo A') {
          goldenCupQuarterfinals.push({
            team1: firstPlace,
            team2: secondPlace, // Placeholder, will match with the actual 2nd place from Group C later
          });
          silverCupQuarterfinals.push({
            team1: thirdPlace,
            team2: fourthPlace, // Placeholder, will match with the actual 4th place from Group C later
          });
        }

        if (group.name === 'Grupo B') {
          goldenCupQuarterfinals.push({
            team1: firstPlace,
            team2: secondPlace, // Placeholder, will match with the actual 2nd place from Group D later
          });
          silverCupQuarterfinals.push({
            team1: thirdPlace,
            team2: fourthPlace, // Placeholder, will match with the actual 4th place from Group D later
          });
        }

        if (group.name === 'Grupo C') {
          goldenCupQuarterfinals.push({
            team1: firstPlace,
            team2: secondPlace, // Placeholder, will match with the actual 2nd place from Group D later
          });
          silverCupQuarterfinals.push({
            team1: thirdPlace,
            team2: fourthPlace, // Placeholder, will match with the actual 4th place from Group D later
          });
        }

        if (group.name === 'Grupo D') {
          goldenCupQuarterfinals.push({
            team1: firstPlace,
            team2: secondPlace, // Placeholder, will match with the actual 2nd place from Group D later
          });
          silverCupQuarterfinals.push({
            team1: thirdPlace,
            team2: fourthPlace, // Placeholder, will match with the actual 4th place from Group D later
          });
        }
      }

      console.log('Golden Cup Quarterfinals:', goldenCupQuarterfinals);

      // Now create quarterfinal matches for both Golden and Silver Cups

      // Generate Golden Cup Quarterfinal Matches
      const goldenCupMatches = [];
      for (let i = 0; i < goldenCupQuarterfinals.length; i++) {
        const quarterfinal = goldenCupQuarterfinals[i];

        // Defensive check for team members before match creation
        if (!quarterfinal.team1 || !quarterfinal.team1.members || !quarterfinal.team1.members[0] || !quarterfinal.team1.members[1] ||
            !quarterfinal.team2 || !quarterfinal.team2.members || !quarterfinal.team2.members[0] || !quarterfinal.team2.members[1]) {
          console.error('Error: Missing team members for Golden Cup match', quarterfinal);
          continue;
        }

        const matchData = {
          match_owner: quarterfinal.team1.members[0].id,
          member_1: quarterfinal.team1.members[0].id,
          member_2: quarterfinal.team1.members[1].id,
          member_3: quarterfinal.team2.members[0].id,
          member_4: quarterfinal.team2.members[1].id,
          cup_type: 'Golden', // Specify that this is a Golden Cup match
          description: `Golden Cup Quarterfinal - ${quarterfinal.team1.members[0].lastName} & ${quarterfinal.team1.members[1].lastName} vs ${quarterfinal.team2.members[0].lastName} & ${quarterfinal.team2.members[1].lastName}`,
          date: new Date().toISOString(),
          publishedAt: new Date().toISOString(), // Ensure match is published
        };

        const match = await strapi.entityService.create('api::match.match', { data: matchData });
        goldenCupMatches.push(match.id);
      }

      // Generate Silver Cup Quarterfinal Matches
      const silverCupMatches = [];
      for (let i = 0; i < silverCupQuarterfinals.length; i++) {
        const quarterfinal = silverCupQuarterfinals[i];

        // Defensive check for team members before match creation
        if (!quarterfinal.team1 || !quarterfinal.team1.members || !quarterfinal.team1.members[0] || !quarterfinal.team1.members[1] ||
            !quarterfinal.team2 || !quarterfinal.team2.members || !quarterfinal.team2.members[0] || !quarterfinal.team2.members[1]) {
          console.error('Error: Missing team members for Silver Cup match', quarterfinal);
          continue;
        }

        const matchData = {
          match_owner: quarterfinal.team1.members[0].id,
          member_1: quarterfinal.team1.members[0].id,
          member_2: quarterfinal.team1.members[1].id,
          member_3: quarterfinal.team2.members[0].id,
          member_4: quarterfinal.team2.members[1].id,
          cup_type: 'Silver', // Specify that this is a Silver Cup match
          description: `Silver Cup Quarterfinal - ${quarterfinal.team1.members[0].lastName} & ${quarterfinal.team1.members[1].lastName} vs ${quarterfinal.team2.members[0].lastName} & ${quarterfinal.team2.members[1].lastName}`,
          date: new Date().toISOString(),
          publishedAt: new Date().toISOString(), // Ensure match is published
        };

        const match = await strapi.entityService.create('api::match.match', { data: matchData });
        silverCupMatches.push(match.id);
      }

      // Update the tournament with Golden and Silver Cup quarterfinal matches
      await strapi.entityService.update('api::tournament.tournament', tournamentId, {
        data: {
          golden_cup: {
            quarterfinals: goldenCupMatches,
          },
          silver_cup: {
            quarterfinals: silverCupMatches,
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