'use strict';

/**
 * court controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::court.court', ({ strapi }) => ({
  async generateTracks(ctx) {
    const { courtId, trackAmount } = ctx.params;  // Get courtId (Venue ID) and trackAmount from the request params
    
    // Validate trackAmount
    const numberOfTracksToCreate = parseInt(trackAmount);
    if (isNaN(numberOfTracksToCreate) || numberOfTracksToCreate <= 0) {
      return ctx.badRequest('Invalid number of tracks');
    }

    try {
      // Fetch the Venue (Court) from the database using the courtId (Venue ID)
      const venue = await strapi.entityService.findOne('api::court.court', courtId, {
        populate: ['tracks'],  // Include existing tracks if any
      });

      if (!venue) {
        return ctx.notFound('Venue not found');
      }

      // Get the number of existing tracks
      const existingTracks = venue.tracks || [];
      const existingTrackCount = existingTracks.length;  // How many tracks already exist
      const totalTracksAfterCreation = existingTrackCount + numberOfTracksToCreate;  // Total tracks after creation

      // Initialize an array to store the new tracks that will be created
      const newTracks = [];

      // Generate tracks starting from the next available number
      for (let i = existingTrackCount; i < totalTracksAfterCreation; i++) {
        const trackNumber = i + 1;  // Start from "Cancha X" based on existing track count
        const trackName = `${venue.name} Cancha ${trackNumber}`;  // Example: "Venue Name Cancha 3", etc.

        // Generate timeslots as a component (array of timeslot objects)
        const timeslots = generateTimeslots();  // This will return an array of timeslot objects

        // Create a new track object and attach the timeslots component, also relate it to the venue
        const newTrack = await strapi.entityService.create('api::track.track', {
          data: {
            name: trackName,
            venue: venue.id,  // Relate the track to the venue using the venue's ID
            timeslots,  // Add timeslots (component) to the track
          },
        });


        // Add the newly created track to the array of newTracks
        newTracks.push(newTrack);
      }

      // Return the list of newly created tracks
      return ctx.send({
        message: `${numberOfTracksToCreate} tracks generated successfully for Venue "${venue.name}"`,
        tracks: newTracks,
      });

    } catch (error) {
      console.error('Error generating tracks:', error);
      return ctx.internalServerError('An error occurred while generating tracks');
    }
  },
}));

// Helper function to generate timeslots (component)
function generateTimeslots() {
  const startTime = new Date();  // Current date, we will adjust hours and minutes
  startTime.setHours(6, 0, 0, 0);  // Set the time to 6:00 AM
  const endTime = new Date();
  endTime.setHours(12, 0, 0, 0);  // Set the time to 12:00 PM

  const timeslots = [];
  while (startTime < endTime) {
    const endTimeSlot = new Date(startTime);  // Copy the start time for end time
    endTimeSlot.setMinutes(startTime.getMinutes() + 30);  // Add 30 minutes to get the end time

    // Create a timeslot object matching the component structure
    timeslots.push({
      start_time: new Date(startTime),
      end_time: endTimeSlot,
      is_reserved: false,  // By default, timeslot is not reserved
    });

    // Increment start time by 30 minutes
    startTime.setMinutes(startTime.getMinutes() + 30);
  }

  return timeslots;  // Return the array of timeslots as a component
}
