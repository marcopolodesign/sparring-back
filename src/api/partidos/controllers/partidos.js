'use strict';

/**
 * match controller
 */

const { parseISO, format } = require('date-fns');
const { es } = require('date-fns/locale');

// Helper function to fetch user profile picture
const getUserProfilePicture = async (profilePicture) => {
    if (!profilePicture) return null;
    return profilePicture?.formats?.small?.url || profilePicture?.url || null;
  };
  const formatMatchDetails = async (match) => {
    // Parse the match date
    const matchDate = match?.Date ? parseISO(match.Date) : null;
  
    // If the date is missing, return an error response
    if (!matchDate) {
      return {
        id: match.id,
        error: 'Invalid or missing match date', // Return a specific error message
      };
    }
  
    const capitalizeFirstLetter = (string) => {
      return string.charAt(0).toUpperCase() + string.slice(1);
    };
  
    const formattedDate = format(matchDate, "EEEE d 'de' MMMM", { locale: es });
    const capitalizedDate = capitalizeFirstLetter(formattedDate);
  
    // Fetch the match owner's profile picture if available
    const matchOwner = match?.match_owner;
    const matchOwnerProfilePictureUrl = await getUserProfilePicture(matchOwner?.profilePicture);
  
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
      };
    };
  
    // Get the individual members if they exist
    const member_1 = match.member_1 ? await fetchMemberDetails(match.member_1) : null;
    const member_2 = match.member_2 ? await fetchMemberDetails(match.member_2) : null;
    const member_3 = match.member_3 ? await fetchMemberDetails(match.member_3) : null;
    const member_4 = match.member_4 ? await fetchMemberDetails(match.member_4) : null;
  
    // Format the final match details
    return {
      id: match.id,
      date: capitalizedDate, // Capitalized date in Spanish
      time: format(matchDate, 'HH:mm', { locale: es }), // Format time in Spanish
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
      publishedAt: match.publishedAt,
      description: match.description,
      ammount_players: match.ammount_players,
      match_owner: matchOwner ? {
        id: matchOwner.id,
        username: matchOwner.username,
        email: matchOwner.email,
        firstName: matchOwner.firstName,
        lastName: matchOwner.lastName,
        profilePictureUrl: matchOwnerProfilePictureUrl, // Add profile picture URL for match owner
      } : null,
      members: [
        member_1,
        member_2,
        member_3,
        member_4,
      ].filter(Boolean), // Filter out any null/undefined members
    };
  };


const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::match.match', ({ strapi }) => ({
  
    // Custom function to fetch all matches
    async findAllMatches(ctx) {
        try {
          // Fetch all matches where the tournament field is null (exclude matches that belong to a tournament)
          const matches = await strapi.entityService.findMany('api::match.match', {
            filters: {
              tournament: {
                id: {
                  $null: true, // Fetch matches where the tournament ID is null
                },
              },
            },
            populate: {
              match_owner: { populate: '*' }, // Populate match owner details
              member_1: { populate: '*' },    // Populate member_1 details
              member_2: { populate: '*' },    // Populate member_2 details
              member_3: { populate: '*' },    // Populate member_3 details
              member_4: { populate: '*' },    // Populate member_4 details
            },
          });

          console.log('matches', matches);
      
          if (!matches || matches.length === 0) {
            return ctx.notFound('No matches found');
          }
      
          // Optionally format each match if needed, or directly return matches
          const formattedMatches = await Promise.all(matches.map(match => formatMatchDetails(match)));
      
          // Return the formatted match details
          ctx.send(formattedMatches);
        } catch (error) {
          console.error('Error fetching all matches:', error);
          ctx.throw(500, 'Internal Server Error');
        }
      },

      async getMatchDetails(ctx) {
        const { matchId } = ctx.params;
        try {
          // Fetch all matches where the tournament field is null (exclude matches that belong to a tournament)
          const match = await strapi.entityService.findOne('api::match.match', matchId, {
            populate: {
              members: { populate: {
                profilePicture: {
                  populate: '*',  // Ensure all fields under profilePicture are populated
                },
              }},
              match_owner: true, 
              date: true, 
              location: true,
              sport: {},
              description: true,
              time: true,
            }
          });

          console.log('match', match);
      
          if (!match ) {
            return ctx.notFound('No matches found');
          }
      
          // Optionally format each match if needed, or directly return matches
          // const formattedMatches = await formatMatchDetails(matches);
      
          // Return the formatted match details

          const formattedMatches = await formatMatchDetails(match);
      
          // Return the formatted match details
          ctx.send(formattedMatches);


          // ctx.send(match);
        } catch (error) {
          console.error('Error fetching all matches:', error);
          ctx.throw(500, 'Internal Server Error');
        }
      },
  }));
  
