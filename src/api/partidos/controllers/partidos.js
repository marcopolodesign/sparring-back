'use strict';

/**
 * match controller
 */

const { format, parseISO } = require('date-fns');
const { utcToZonedTime, format: formatTz } = require('date-fns-tz');

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
    const matchDate = match?.Date ? parseISO(match.Date) : null;
  
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
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
    const zonedDate = utcToZonedTime(matchDate, timeZone); // Convert to the device's time zone
    const formattedDate = format(zonedDate, "EEEE d 'de' MMMM", { locale: es });
    const capitalizedDate = capitalizeFirstLetter(formattedDate);
  
    // Format the time to the device's local timezone
    const formattedTime = formatTz(zonedDate, 'HH:mm', { timeZone });
  
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
  
    // Fetch the members if they are not null
    const member_1 = match.member_1 ? await fetchMemberDetails(match.member_1) : null;
    const member_2 = match.member_2 ? await fetchMemberDetails(match.member_2) : null;
    const member_3 = match.member_3 ? await fetchMemberDetails(match.member_3) : null;
    const member_4 = match.member_4 ? await fetchMemberDetails(match.member_4) : null;
  
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
      profilePictureUrl: match.match_owner.profilePictureUrl,
    } : null,
    members,
  };

  // Add individual members to the response only if they are not null
  if (member_1) response.member_1 = member_1;
  if (member_2) response.member_2 = member_2;
  if (member_3) response.member_3 = member_3;
  if (member_4) response.member_4 = member_4;

  return response;
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
            location: true,   // Populate location details
            sport: true,  
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
  
