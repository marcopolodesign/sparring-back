const { createCoreController } = require('@strapi/strapi').factories;
const axios = require('axios');

module.exports = createCoreController('api::tournament.tournament', ({ strapi }) => ({
  // async createMatches(ctx) {
  //   const { tournamentId } = ctx.params;
  
  //   try {
  //     // Fetch the tournament by ID, and populate groups with couples and matches
  //     const tournament = await strapi.entityService.findOne('api::tournament.tournament', tournamentId, {
  //       populate: {
  //         groups: {
  //           populate: {
  //             couples: {
  //               populate: '*', // Populate all fields within couples
  //             },
  //             matches: true, // Populate existing matches
  //           },
  //         },
  //       },
  //     });
  
  //     if (!tournament) {
  //       return ctx.notFound('Tournament not found');
  //     }
  
  //     const matches = [];
  
  //     // Iterate over each group to generate matches
  //     for (const group of tournament.groups) {
  //       const couples = group.couples;
  
  //       // if (couples.length !== 4) {
  //       //   throw new Error(`Group ${group.name} must have exactly 4 couples`);
  //       // }
  
  //       const groupMatchIds = [];
  
  //       // Generate all possible matches for this group
  //       for (let i = 0; i < couples.length; i++) {
  //         for (let j = i + 1; j < couples.length; j++) {
  
  //           // Create 4 sets for each couple
  //           const sets = [];
  
  //           for (let setNumber = 1; setNumber <= 3; setNumber++) {
  //             const setComponent = {
  //               gamesWon: 0,  // Initialize with 0 games won
  //             };
  //             sets.push(setComponent);
  //           }
  
  //           // Prepare the match data with couple IDs, members, and newly created sets
  //           const matchData = {
  //             match_owner: couples[i].members[0].id, // Set participant1 of couple1 as match_owner
  //             member_1: couples[i].members[0].id,   // participant1 of couple1 as member_1
  //             member_2: couples[i].members[1].id,   // participant2 of couple1 as member_2
  //             member_3: couples[j].members[0].id,   // participant1 of couple2 as member_3
  //             member_4: couples[j].members[1].id,   // participant2 of couple2 as member_4
  //             ammount_players: 4, // Set the number of players
  //             group_name: group.name,  // Store group name or ID,
  //             tournament: tournamentId,
  //             description: `${group.name} - ${couples[i].members[0].firstName} & ${couples[i].members[1].firstName} vs ${couples[j].members[0].firstName} & ${couples[j].members[1].firstName}`,
  //             date: new Date().toISOString(), // You can customize the date logic
  //             publishedAt: new Date().toISOString(), // Ensure the match is published
  //             couples: [
  //               {
  //                 id: couples[i].id, // Pass the couple ID
  //                 members: [
  //                   { id: couples[i].members[0].id },
  //                   { id: couples[i].members[1].id }
  //                 ],
  //                 sets: sets // Assign the created sets to the couple
  //               },
  //               {
  //                 id: couples[j].id, // Pass the couple ID
  //                 members: [
  //                   { id: couples[j].members[0].id },
  //                   { id: couples[j].members[1].id }
  //                 ],
  //                 sets: sets // Assign the created sets to the couple
  //               }
  //             ]
  //           };
  
  //           // Create the match asynchronously
  //           const match = await strapi.entityService.create('api::match.match', { data: matchData });
  //           matches.push(match);
  //           groupMatchIds.push({ id: match.id }); // Wrap the match ID in an object
  //         }
  //       }
  
  //       // Update the group with the newly created matches
  //       group.matches = [...group.matches.map(m => ({ id: m.id })), ...groupMatchIds];
  //     }
  
  //     // Update the entire tournament with the modified groups
  //     await strapi.entityService.update('api::tournament.tournament', tournamentId, {
  //       data: {
  //         groups: tournament.groups,
  //       },
  //     });
  
  //     ctx.body = { message: 'Matches generated and added to groups successfully', matches };
  //   } catch (err) {
  //     ctx.throw(500, err.message)
  //   }
  // },

  async createMatches(ctx) {
  ctx.body="Hello World"
  }
  
}
));
