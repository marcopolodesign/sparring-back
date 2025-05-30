'use strict';

/**
 * match controller
 */

const { format, parseISO } = require('date-fns');
const { toZonedTime, format: formatTz } = require('date-fns-tz');

const { es } = require('date-fns/locale');


// Helper function to fetch user profile picture
const getUserProfilePicture = async (profilePicture) => {
    if (!profilePicture) return null;
    return profilePicture?.formats?.small?.url || profilePicture?.url || null;  };

  
  const formatMatchDetails = async (match) => {
    if (!match) {
      return { error: 'Match is undefined' };
    }
  
    // Parse the match date
    const matchDate = match?.Date ? new Date(match.Date) : null;
  
    if (!matchDate) {
      return {
        id: match.id,
        error: 'Invalid or missing match date',
      };
    }
  
    const capitalizeFirstLetter = (string) => {
      return string.charAt(0).toUpperCase() + string.slice(1);
    };
  
    // Get the device's current time zone dynamically
    // const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
    // const zonedDate = toZonedTime(matchDate, timeZone); // Convert to the device's time zone
    const formattedDate = format(matchDate, "EEEE d 'de' MMMM", { locale: es });
    const capitalizedDate = capitalizeFirstLetter(formattedDate);
  
    // Format the time to the device's local timezone
    const formattedTime = format(matchDate, 'HH:mm'); // ✅ Prevents conversion to UTC
  
    // Helper function to fetch member details
    const fetchMemberDetails = async (member) => {
      if (!member) return null;
      const profilePictureUrl = await getUserProfilePicture(member?.profilePicture);
      return {
        id: member.id,
        username: member.username,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        profilePictureUrl,
        phone: member.phone || null,
      };
    };
  
    // Fetch the members if they are not null
    const member_1 = match.member_1 ? await fetchMemberDetails(match.member_1) : null;
    const member_2 = match.member_2 ? await fetchMemberDetails(match.member_2) : null;
    const member_3 = match.member_3 ? await fetchMemberDetails(match.member_3) : null;
    const member_4 = match.member_4 ? await fetchMemberDetails(match.member_4) : null;
  
    // console.log(member_1, 'member_1')
    // Format the final match details, filtering out any null members
    const members = [
      member_1,
      member_2,
      member_3,
      member_4,
    ].filter(Boolean); // Filter out null or undefined members
   // Prepare the response object and dynamically add members only if they exist
   const response = {
    id: match.id,
    date: capitalizedDate,
    time: formattedTime,
    originalDate: match.Date,
    createdAt: match.createdAt,
    updatedAt: match.updatedAt,
    publishedAt: match.publishedAt,
    description: match.description,
    ammount_players: match.ammount_players,
    location: match.location,
    sport: match.sport,
    match_owner: match.match_owner ? {
      id: match.match_owner.id,
      username: match.match_owner.username,
      email: match.match_owner.email,
      firstName: match.match_owner.firstName,
      lastName: match.match_owner.lastName,
      profilePictureUrl: member_1 ? member_1.profilePictureUrl : null,
      level: match.match_owner.level,
    } : null,
    members,
    is_private: match.is_private,
    has_reservation: match.has_reservation,
  };

  // Add individual members to the response only if they are not null
  if (member_1) response.member_1 = member_1;
  if (member_2) response.member_2 = member_2;
  if (member_3) response.member_3 = member_3;
  if (member_4) response.member_4 = member_4;
  if (match.couples) response.couples = match.couples

  return response;
  };

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::match.match', ({ strapi }) => ({
  
    // Custom function to fetch all matches
    async findAllMatches(ctx) {
      try {
        const { filters, userId } = ctx.params;

        console.log('FILTERS:', filters);
        console.log('USER ID:', userId);
    
        // Get current date and time
        const currentDate = new Date();
    
        // Define default filters (fetch matches where the tournament ID is null)
        const defaultFilters = {
          tournament: {
            id: {
              $null: true,
            },
          },
          // Filter matches that haven't happened yet (date is greater than current date)
          date: {
            $gt: currentDate.toISOString(), // Compare with today's date
          },
        };
    
        // Merge the default filters with any filters passed in the query string
        const combinedFilters = {
          ...defaultFilters,
          filters,
        };
    
        // Fetch all matches based on the combined filters
        const matches = await strapi.entityService.findMany('api::match.match', {
          filters: defaultFilters,
          populate: {
            match_owner: { populate: '*' }, // Populate all match owner fields
            members: { // Populate members and their profile pictures
              populate: { 
                profilePicture: { 
                  fields: ['url'], // Only fetch the URL of the profile picture
                }
              }
            },
            member_1: { populate: '*' },    // Populate member_1 details
            member_2: { populate: '*' },    // Populate member_2 details
            member_3: { populate: '*' },    // Populate member_3 details
            member_4: { populate: '*' },    // Populate member_4 details
            location: true,   // Populate location details
            sport: true,  
          },
        });
    
        // Log the result of the matches query
        // console.log('MATCHESSSSSSSSSSS', matches);
    
        // Check if matches is an array and has entries
        if (!Array.isArray(matches) || matches.length === 0) {
          return ctx.notFound('No matches found');
        }
    
        // Filter matches where members.length < ammount_players and userId is not part of the members
        const filteredMatches = matches.filter(match => {
          const totalMembers = [
            match.member_1,
            match.member_2,
            match.member_3,
            match.member_4
          ].filter(Boolean).length; // Filter out null or undefined members
    
          // Exclude matches where userId is a member
          const isUserMember = [
            match.member_1?.id,
            match.member_2?.id,
            match.member_3?.id,
            match.member_4?.id
          ].includes(Number(userId));
    
          return totalMembers < match.ammount_players && !isUserMember;
        });
    
        // Format each match if needed
        const formattedMatches = await Promise.all(filteredMatches.map(match => formatMatchDetails(match)));
    
        // Return the formatted match details
        ctx.send(formattedMatches);
      } catch (error) {
        console.error('Error fetching all matches:', error);
        ctx.throw(500, 'Internal Server Error');
      }
    },


    async findUpcomingMatches(ctx) {
      try {
        const { userId } = ctx.params;
  
        // Get current date and time in ISO format
        const currentDate = new Date().toISOString();
  
        // Apply filters directly in the query
        const filters = {
          // Tournament should be null (not part of any tournament)
          tournament: {
            id: {
              $null: true,
            },
          },
          // The match should be in the future
          date: {
            $gt: currentDate, // Only fetch matches where date is greater than the current date
          },
            // Ensure the match is not private
          is_private: {
            $ne: true, // Exclude matches where is_private is true
          },
          // Check that the number of members is less than the ammount_players
          $and: [
            {
              $or: [
                { member_1: { $null: true } }, // Check if member_1 is null
                { member_2: { $null: true } },
                { member_3: { $null: true } },
                { member_4: { $null: true } },
              ],
            },
            {
              // Exclude matches where the user is already a member
              $or: [
                { member_1: { id: { $ne: userId } } },
                { member_2: { id: { $ne: userId } } },
                { member_3: { id: { $ne: userId } } },
                { member_4: { id: { $ne: userId } } },
              ],
            },
          ],
        };

        console.log(userId, 'USER ID FROM CONTROLLER');
  
        const matches = await strapi.service('api::partidos.partidos').findUpcomingMatches(userId, currentDate);
  
        // Log matches for debugging
        console.log('Matches:', matches);
  
        // Check if matches is an array and has entries
        if (!Array.isArray(matches) || matches.length === 0) {
          return ctx.notFound('No matches found');
        }
        const formattedMatches = await Promise.all(matches.map(match => formatMatchDetails(match)));
    
        // Return the formatted match details
        ctx.send(formattedMatches);
      } catch (error) {
        console.error('Error fetching upcoming matches:', error);
        ctx.throw(500, 'Internal Server Error');
      }
    },

    async getMatchDetails(ctx) {
      const { matchId } = ctx.params;
    
      try {
        // Fetch the match details
        const match = await strapi.entityService.findOne('api::match.match', matchId, {
          populate: {
            match_owner: { populate: '*' }, // Populate all match owner fields
            members: { // Populate members and their profile pictures
              populate: { 
                profilePicture: { 
                  fields: ['url'], // Only fetch the URL of the profile picture
                  // You can include 'formats' if you want the different sizes of the image
                }
              }
            },
            member_1: { populate: '*' },    // Populate member_1 details
            member_2: { populate: '*' },    // Populate member_2 details
            member_3: { populate: '*' },    // Populate member_3 details
            member_4: { populate: '*' },    // Populate member_4 details
            location: true,   // Populate location details
            sport: true,  
            couples: true,    // Populate couples
            is_private: true, // Populate is_private
            has_reservation: true,
          },
        });
    
        if (!match) {
          return ctx.notFound('Match not found');
        }
    
        // console.log('MATCH DETAILS:', match);
        // Format the match details
        const formattedMatch = await formatMatchDetails(match);

        console.log('FORMATTED MATCH:', formattedMatch);
    
        // Return formatted match details
        ctx.send(formattedMatch);
      } catch (error) {
        console.error('Error fetching match details:', error);
        ctx.throw(500, 'Internal Server Error!! ');
      }
    },

    async findMatchesByUser(ctx) {
      try {
        const { userId } = ctx.params;   // Get the userId from the path parameter    
        // Convert isMatchOwner to a boolean (optional, based on your use case)
        const currentDate = new Date().toISOString();

        const matches = await strapi.service('api::partidos.partidos').findUpcomingMatches(userId, currentDate, true);
  
        // Log the result of the matches query
        console.log('MATCHESSSSSSSSSSS', matches);
  
        // Check if matches is an array and has entries
        if (!Array.isArray(matches) || matches.length === 0) {
          return ctx.notFound('No matches found');
        }
  
        // Format each match if needed
        const formattedMatches = await Promise.all(matches.map(match => formatMatchDetails(match)));
  
        // Return the formatted match details
        ctx.send(formattedMatches);
      } catch (error) {
        console.error('Error fetching matches by user:', error);
        ctx.throw(500, 'Internal Server Error');
      }
    },

    async findHistoricMatchesByUser(ctx) {
      try {
        const { userId } = ctx.params;   // Get the userId from the path parameter
        const { isMatchOwner } = ctx.query;  // Get the isMatchOwner from the query parameter
    
        // Convert isMatchOwner to a boolean (optional, based on your use case)
        const isMatchOwnerBool = isMatchOwner === 'true';

        const currentDate = new Date().toISOString();

       
        const matches = await strapi.service('api::partidos.partidos').findEndedMatches(userId, currentDate, true);
  
        // Log the result of the matches query
        // console.log('MATCHESSSSSSSSSSS', matches);
  
        // Check if matches is an array and has entries
        if (!Array.isArray(matches) || matches.length === 0) {
          return ctx.notFound('No matches found');
        }
  
        // Format each match if needed
        const formattedMatches = await Promise.all(matches.map(match => formatMatchDetails(match)));
  
        // Return the formatted match details
        ctx.send(formattedMatches);
      } catch (error) {
        console.error('Error fetching matches by user:', error);
        ctx.throw(500, 'Internal Server Error');
      }
    },

    async getCommonMatches(ctx) {
      try {
        const { userId, friendId } = ctx.params;
  
        if (!userId || !friendId) {
          return ctx.badRequest('Both userId and friendId are required.');
        }
  
        const commonMatches = await strapi.db.query('api::match.match').findMany({
          where: {
            $and: [
              { members: { id: userId } },
              { members: { id: friendId } }
            ]
          },
          populate: {
            match_owner: { populate: { profilePicture: { fields: ['url'] } } }, 
            members: { populate: { profilePicture: { fields: ['url'] } } },
            member_1: { populate: { profilePicture: { fields: ['url'] } } },
            member_2: { populate: { profilePicture: { fields: ['url'] } } },
            member_3: { populate: { profilePicture: { fields: ['url'] } } },
            member_4: { populate: { profilePicture: { fields: ['url'] } } },
            location: true,
            sport: true,
            is_private: true, // Populate is_private
            has_reservation: true,
            couples: { 
              populate: { 
                members: { 
                  populate: { profilePicture: { fields: ['url'] } } 
                } 
              } 
            },
          },
        });
  
        const formattedMatches = await Promise.all(commonMatches.map(match => formatMatchDetails(match)));
  
        return ctx.send(formattedMatches);
  
      } catch (error) {
        strapi.log.error('Error fetching common matches:', error);
        return ctx.internalServerError('Something went wrong while fetching common matches.');
      }
    },
  
    // ✅ New function to calculate wins/losses against a specific user
    async getUserMatchMetrics(ctx) {
      try {
        const { userId, friendId } = ctx.params;
  
        if (!userId || !friendId) {
          return ctx.badRequest('Both userId and friendId are required.');
        }
  
        // Reuse `getCommonMatches` function
        const commonMatches = await strapi.db.query('api::match.match').findMany({
          where: {
            $and: [
              { members: { id: userId } },
              { members: { id: friendId } }
            ]
          },
          populate: ['couples.members'], // Populate teams
        });
  
        let wins = 0;
        let losses = 0;
  
        commonMatches.forEach(match => {
          const { couples } = match;
  
          if (!couples || couples.length === 0) return;
  
          // Determine winning couple (highest last set score)
          const winningCouple = couples.reduce((winner, couple) => {
            const lastSetScore = couple.score?.[couple.score.length - 1] || 0;
            return lastSetScore > (winner?.score?.[winner.score.length - 1] || 0) ? couple : winner;
          }, null);
  
          // Check if the user was in the winning couple
          const userInWinningCouple = winningCouple?.members.some(member => member.id === parseInt(userId));
  
          if (userInWinningCouple) {
            wins++;
          } else {
            losses++;
          }
        });
  
        return ctx.send({
          userId,
          friendId,
          totalMatches: commonMatches.length,
          wins,
          losses,
        });
  
      } catch (error) {
        strapi.log.error('Error fetching match metrics:', error);
        return ctx.internalServerError('Something went wrong while calculating match metrics.');
      }
    },
    
  }));
  
