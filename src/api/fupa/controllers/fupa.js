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

  async getQuarterfinalMatchesByUser(ctx) {
    const { userId, tournamentId } = ctx.params;  // Get the user ID and tournament ID from the URL params
  
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
  
      const userQuarterfinalMatches = {
        goldenCupMatches: [],
        silverCupMatches: [],
        cupType: '' // To indicate which cup the user is in
      };
  
      // Function to check if a user is part of a match's couples
      const isUserInMatch = (match, userId) => {
        return match.couples.some(couple => {
          return couple.members.some(member => member && member.id === parseInt(userId, 10));
        });
      };
  
      // Helper function to format match results with couples and their sets
      const formatMatchResult = (match) => {
        const formattedCouples = match.couples.map(couple => ({
          coupleId: couple.id,
          members: couple.members.map(member => ({
            id: member.id,
            firstName: `${member.firstName}`,
            lastName: `${member.lastName}`,
            profilePicture: member.profilePicture?.formats?.small?.url || null,  // Fetch the small format URL of profile picture
          })),
          sets: couple.sets ? couple.sets.map(set => ({
            setId: set.id,
            gamesWon: set.gamesWon,
          })) : [] // Ensure sets exists, otherwise return an empty array
        }));
  
        return {
          id: match.id,
          description: match.description,
          couples: formattedCouples
        };
      };
  
      // Check if the user is in Golden Cup quarterfinals
      if (tournament.golden_cup && tournament.golden_cup.quarterfinals) {
        for (const match of tournament.golden_cup.quarterfinals) {
          if (isUserInMatch(match, userId)) {
            userQuarterfinalMatches.goldenCupMatches = tournament.golden_cup.quarterfinals.map(formatMatchResult);
            userQuarterfinalMatches.cupType = 'Golden';
            break;
          }
        }
      }
  
      // Check if the user is in Silver Cup quarterfinals
      if (tournament.silver_cup && tournament.silver_cup.quarterfinals && userQuarterfinalMatches.cupType === '') {
        for (const match of tournament.silver_cup.quarterfinals) {
          if (isUserInMatch(match, userId)) {
            userQuarterfinalMatches.silverCupMatches = tournament.silver_cup.quarterfinals.map(formatMatchResult);
            userQuarterfinalMatches.cupType = 'Silver';
            break;
          }
        }
      }
  
      // Send the results back to the client
      if (userQuarterfinalMatches.cupType) {
        ctx.send(userQuarterfinalMatches);
      } else {
        ctx.send({ message: 'User is not part of any quarterfinal matches' });
      }
  
    } catch (err) {
      console.error('Error fetching quarterfinal matches by user:', err);
      ctx.throw(500, 'Failed to fetch quarterfinal matches');
    }
  },

  async getSemifinalMatches(ctx) {
    const { tournamentId } = ctx.params;
  
    try {
      // Fetch the tournament with the semifinals populated
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
              semifinals: {
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
  
      const allSemifinalMatches = {
        goldenCupSemifinals: [],
        silverCupSemifinals: [],
      };
  
      // Helper function to format match results with couples and their sets
      const formatMatchResult = (match) => {
        const formattedCouples = match.couples.map(couple => ({
          coupleId: couple.id,
          members: couple.members.map(member => ({
            id: member.id,
            firstName: `${member.firstName}`,
            lastName: `${member.lastName}`,
            profilePicture: member.profilePicture?.formats?.small?.url || null,  // Fetch the small format URL of profile picture
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
  
      // Collect all Golden Cup semifinal matches
      if (tournament.golden_cup && tournament.golden_cup.semifinals) {
        for (const match of tournament.golden_cup.semifinals) {
          allSemifinalMatches.goldenCupSemifinals.push(formatMatchResult(match));
        }
      }
  
      // Collect all Silver Cup semifinal matches
      if (tournament.silver_cup && tournament.silver_cup.semifinals) {
        for (const match of tournament.silver_cup.semifinals) {
          allSemifinalMatches.silverCupSemifinals.push(formatMatchResult(match));
        }
      }
  
      // Send the results back to the client
      ctx.send(allSemifinalMatches);
  
    } catch (err) {
      console.error('Error fetching semifinal matches:', err);
      ctx.throw(500, 'Failed to fetch semifinal matches');
    }
  },
  async getFinalMatches(ctx) {
    const { tournamentId } = ctx.params;
  
    try {
      // Fetch the tournament with the finals populated
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
              final: {
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
  
      const allFinalMatches = {
        goldenCupFinal: [],
        silverCupFinal: [],
      };
  
      // Helper function to format match results with couples and their sets
      const formatMatchResult = (match) => {
        const formattedCouples = match.couples.map(couple => ({
          coupleId: couple.id,
          members: couple.members.map(member => ({
            id: member.id,
            firstName: `${member.firstName}`,
            lastName: `${member.lastName}`,
            profilePicture: member.profilePicture?.formats?.small?.url || null,  // Fetch the small format URL of profile picture
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
  
      // Collect the Golden Cup final match
      if (tournament.golden_cup && tournament.golden_cup.final) {
        const finalMatch = tournament.golden_cup.final;
        allFinalMatches.goldenCupFinal.push(formatMatchResult(finalMatch));
      }
  
      // Collect the Silver Cup final match
      if (tournament.silver_cup && tournament.silver_cup.final) {
        const finalMatch = tournament.silver_cup.final;
        allFinalMatches.silverCupFinal.push(formatMatchResult(finalMatch));
      }
  
      // Send the results back to the client
      ctx.send(allFinalMatches);
  
    } catch (err) {
      console.error('Error fetching final matches:', err);
      ctx.throw(500, 'Failed to fetch final matches');
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
              profilePicture: member.profilePicture?.formats?.small?.url || null,
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

