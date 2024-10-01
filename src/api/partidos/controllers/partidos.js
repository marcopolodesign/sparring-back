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

        console.log(currentDate, 'currentDate');
  
        // Fetch matches using the combined filters
        const matches = await strapi.db.query('api::match.match').findMany({
          where: {
            Date: {
              $gt: currentDate, // Filter by date
            },
          },
          populate: {
            match_owner: { 
              populate: { 
                profilePicture: { fields: ['url'] } // Populate profilePicture fields of match_owner
              }
            },
            members: { 
              populate: { 
                profilePicture: { fields: ['url'] } // Populate profilePicture fields of members
              } 
            },
            member_1: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_1
            member_2: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_2
            member_3: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_3
            member_4: { populate: { profilePicture: { fields: ['url'] } } }, // Populate member_4
            location: true,  // Populate location
            sport: true      // Populate sport
          },
        });
  
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
        ctx.throw(500, 'Internal Server Error');
      }
    },
    
  }));
  
