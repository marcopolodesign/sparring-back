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
    if (!match) {
      return { error: 'Match is undefined' };  // Return an error if match is undefined
    }
  
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
    const matchOwnerProfilePictureUrl = matchOwner?.profilePicture
      ? matchOwner.profilePicture?.formats?.small?.url || matchOwner.profilePicture?.url
      : null;
  
    // Helper function to fetch member details
    const fetchMemberDetails = async (member) => {
      if (!member) return null;
  
      const profilePictureUrl = member?.profilePicture
        ? member.profilePicture?.formats?.small?.url || member.profilePicture?.url
        : null;
  
      return {
        id: member.id,
        username: member.username,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        profilePictureUrl,
      };
    };
  
    // Check if members array exists and format it
    const formattedMembers = match?.members && Array.isArray(match.members)
      ? await Promise.all(match.members.map(fetchMemberDetails))
      : [];
  
    // Filter out any null members
    const filteredMembers = formattedMembers.filter(Boolean);
  
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
      location: match.location,
      sport: match.sport,
      match_owner: matchOwner ? {
        id: matchOwner.id,
        username: matchOwner.username,
        email: matchOwner.email,
        firstName: matchOwner.firstName,
        lastName: matchOwner.lastName,
        profilePictureUrl: matchOwnerProfilePictureUrl, // Corrected profile picture fetching
      } : null,
      members: filteredMembers, // Return filtered members array (remove any null/undefined entries)
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
          },
        });
        
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
        console.error('Error fetching all matches:', error);
        ctx.throw(500, 'Internal Server Error');
      }
    },

    async getMatchDetails(ctx) {
      const { matchId } = ctx.params;
    
      try {
        // Fetch the match details
        const match = await strapi.entityService.findOne('api::match.match', matchId, {
          populate: {
            members: {
              populate: {
                profilePicture: {
                  populate: '*', // Ensure profilePicture formats are populated for members
                },
              },
            },
            match_owner: {
              populate: {
                profilePicture: {
                  populate: '*', // Ensure profilePicture formats are populated for match_owner
                },
              },
            },
            location: true,
            sport: true,
          },
        });
    
        if (!match) {
          return ctx.notFound('Match not found');
        }
    
        // Format the match details
        const formattedMatch = await formatMatchDetails(match);
    
        // Return formatted match details
        ctx.send(formattedMatch);
      } catch (error) {
        console.error('Error fetching match details:', error);
        ctx.throw(500, 'Internal Server Error');
      }
    },
  }));
  
