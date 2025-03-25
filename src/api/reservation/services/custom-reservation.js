'use strict';
// @ts-ignore
// @ts-ignore
const qs = require('qs');
// @ts-ignore
// @ts-ignore
const { parseISO, addMinutes, subMinutes, format, differenceInMinutes, isBefore, parse,  startOfDay, isToday, addHours, isAfter } = require('date-fns');
const { es } = require('date-fns/locale');
const { toZonedTime  } = require('date-fns-tz');

module.exports = () => ({
  async checkAvailabilityWithinPeriodBot({ venueId, date, time = '08:00' }) {

    console.log('🧪 venueId recibido:', venueId);

    try {
      const now = new Date();

      // ----------------------------------------------------------------
      // 1. Obtener tracks del venue
      // ----------------------------------------------------------------
      const venue = await strapi.entityService.findOne('api::court.court', venueId, {
        populate: { tracks: true },
      });

      if (!venue || !venue.tracks || venue.tracks.length === 0) {
        return {
          venueId,
          venueName: venue?.name || `Venue ${venueId}`,
          venueAvailability: [],
          results: [],
        };
      }

      const trackIds = venue.tracks.map((track) => track.id);

      // ----------------------------------------------------------------
      // 2. Calcular rango de tiempo (+90 / +240 mins)
      // ----------------------------------------------------------------
      const baseDateString = `${date}T${time}:00.000`;
      const baseDate = new Date(baseDateString);
      const startTime = new Date(`${date}T07:00:00.000`);
      const endTime = new Date(`${date}T23:00:00.000`);

      const startMinsRange = startTime.getHours() * 60 + startTime.getMinutes();
      const endMinsRange = endTime.getHours() * 60 + endTime.getMinutes();

      const isToday = date === new Date().toISOString().split('T')[0];
      const nowInMinutes = now.getHours() * 60 + now.getMinutes();

      // ----------------------------------------------------------------
      // 3. Obtener reservas
      // ----------------------------------------------------------------
      const allReservations = await strapi.entityService.findMany('api::reservation.reservation', {
        filters: {
          date,
          court: { id: { $in: trackIds } },
        },
        populate: { court: true },
      });


      // Crear mapa de reservas por track
      const reservedSlotsMap = {};
      for (const id of trackIds) reservedSlotsMap[id] = new Set();

      for (const res of allReservations) {
        const trackId = res.court?.id;
        if (!trackId) continue;

        const startDate = new Date(res.start_time);
        const endDate = new Date(res.end_time);
        
        const startH = startDate.getHours();
        const startM = startDate.getMinutes();
        const endH = endDate.getHours();
        const endM = endDate.getMinutes();
        
        let start = startH * 60 + startM;
        const end = endH * 60 + endM;

        while (start < end) {
          reservedSlotsMap[trackId].add(start);
          start += 30;
        }
      }

      // ----------------------------------------------------------------
      // 4. Generar slots por track
      // ----------------------------------------------------------------
      const timeslots = [];
      for (let mins = 8 * 60; mins <= 23 * 60; mins += 30) {
        if (mins >= startMinsRange && mins <= endMinsRange) {
          if (!isToday || mins >= nowInMinutes) {
            timeslots.push(mins);
          }
        }
      }

      console.log('timeslots', timeslots);

      const results = [];
      for (const trackId of trackIds) {
        const available = [];
        for (const slot of timeslots) {
          if (!reservedSlotsMap[trackId].has(slot)) {
            const hh = String(Math.floor(slot / 60)).padStart(2, '0');
            const mm = String(slot % 60).padStart(2, '0');
            available.push(`${hh}:${mm}`);
          }
        }

        const track = venue.tracks.find((t) => t.id === trackId);
        results.push({
          id: trackId,
          name: track?.name || `Track ${trackId}`,
          availability: available,
        });
      }

      // ----------------------------------------------------------------
      // 5. Merge availability y devolver
      // ----------------------------------------------------------------
      const venueAvailability = [...new Set(results.flatMap(r => r.availability))].sort();

      console.log('venueAvailability', venueAvailability);

      return {
        venueId,
        venueName: venue.name,
        venueAvailability,
        results,
      };

    } catch (err) {
      console.error('❌ Error en checkAvailabilityWithinPeriodBot:', err);
      throw new Error('Error procesando disponibilidad');
    }
  }
});