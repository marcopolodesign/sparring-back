'use strict';
module.exports = {
  async handleFlow(ctx) {
    const { step, venue_name, date, time, duration_minutes, activity, user_name } = ctx.request.body;


    let venue = null;
    let venueId = null;
    let matchedProduct = null;

    try {
      if (step === 'check_availability') {
        // 1. Buscar el club por nombre usando entityService
        const venues = await strapi.entityService.findMany('api::court.court', {
          filters: { name: { $containsi: venue_name } }, // Match insensible a mayúsculas
        });

        console.log('venue_name', venue_name);
        console.log('date', date); 
        console.log('venues', venues);

        venue = venues?.[0];
        if (!venue) {
          return ctx.send({ message: `No encontré un lugar llamado ${venue_name}.` });
        }

        venueId = venue.id;

          // Si no hay fecha u hora, pedirla
          if (!date || !time) {
            return ctx.send({
              message: `Perfecto, ${venues[0]?.name} es una sede válida. ¿Para qué día y a qué hora querés reservar una cancha de pádel?`,
            });
          }

          // Si hay info suficiente, continuar
          const availability = await strapi
            .service('api::reservation.custom-reservation')
            .checkAvailabilityWithinPeriodBot({ venueId, date, time });

          const times = availability.venueAvailability;

          const message = times.length
            ? `Hoy ${venues[0]?.name} tiene disponibles a las ${times.join(', ')}. ¿Querés reservar alguna?`
            : `No hay horarios disponibles en ${venues[0]?.name} para hoy.`;

          return ctx.send({ message });
      }

      if (step === 'get_price') {
        // Buscar el venue si no lo tenemos
        if (!venue) {
          const venues = await strapi.entityService.findMany('api::court.court', {
            filters: { name: { $containsi: venue_name } },
          });
          venue = venues?.[0];
          if (!venue) {
            return ctx.send({ message: `No encontré un lugar llamado ${venue_name}.` });
          }
          venueId = venue.id;
        }
      
        // Obtener alquileres
        const rentals = await strapi
          .service('api::product.custom-product')
          .getVenueRentals(venue.id);

          console.log('📦 Rentals:', rentals.map(r => r.name));
          console.log(rentals, 'rentals')
      
          const expectedName = `Pádel ${duration_minutes} minutos`;

          let selectedProduct = rentals.find(
            (p) => p.name?.trim().toLowerCase() === expectedName.toLowerCase()
          );
      
        console.log('selectedProduct', selectedProduct);

        // Fallback automático a Pádel 90 minutos
        if (!selectedProduct) {
          selectedProduct = rentals.find(
            (p) => p.name?.trim().toLowerCase() === 'pádel 90 minutos'
          );
          console.log('🔁 Falling back to Pádel 90 minutos:', selectedProduct);
        }

        if (!selectedProduct) {
          return ctx.send({
            message: `No encontré un producto disponible para reservar.`,
          });
        }
        const price = selectedProduct.customPrice || selectedProduct.defaultPrice;
      
        return ctx.send({
          message: `Perfecto, el precio para reservar en ${venue.name} por ${duration_minutes} minutos es de $${price}. ¿A nombre de quién hacemos la reserva?`,
        });
      }
      if (step === 'confirm_booking') {

        // if (!venue || !date || !time || !duration_minutes || !user_name) {
        //   return ctx.send({
        //     message: 'Faltan datos para confirmar la reserva. Por favor asegurate de haber indicado el lugar, día, hora, duración y nombre de quien reserva.'
        //   });
        // }

        // Si venue no está seteado, buscarlo de nuevo
        if (!venue) {
          const venues = await strapi.entityService.findMany('api::court.court', {
            filters: { name: { $containsi: venue_name } },
            populate: { tracks: true },
          });
      
          venue = venues?.[0];
          if (!venue) {
            return ctx.send({ message: `No encontré un lugar llamado ${venue_name}.` });
          }
          venueId = venue.id;
        }
      
        // Si product no está seteado, buscarlo también
        if (!matchedProduct && activity && duration_minutes) {
          const tag = `${activity}-${duration_minutes}`;
          const products = await strapi.entityService.findMany('api::product.product', {
            filters: { sku: { $eq: tag } },
          });
          matchedProduct = products?.[0];
        }
      
        // 🧠 Buscar una cancha libre
        const trackId = await seleccionarCanchaDisponible(venueId, date, time);
      
        // ✅ Crear la reserva
        const reservation = await strapi.entityService.create('api::reservation.reservation', {
          data: {
            owner: 52,
            seller: 52,
            date,
            start_time: normalizarHora(time),
            end_time: normalizarHora(calcularHoraFinal(time, duration_minutes)),
            court: trackId,
            venue: venueId,
            products: matchedProduct ? [matchedProduct.id] : [],
            type: 'alquiler', 
            duration: duration_minutes,
            status: 'pending_payment',
          },
        });
      
        return ctx.send({
          message: `¡Listo! Reservamos a nombre de ${user_name} para hoy a las ${time}. Te esperamos 🥊`,
          reservation_id: reservation.id,
        });
      }
      return ctx.send({ message: 'Paso desconocido.' });

    } catch (error) {
      console.error('Error en custom-booking-flow:', error);
      return ctx.send({ message: 'Ocurrió un error procesando tu solicitud.' });
    }
  },
};

// pseudo-lógica
const seleccionarCanchaDisponible = async (venueId, date, time) => {

  if (!venueId || !date || !time) {
    throw new Error('Faltan datos para buscar disponibilidad de cancha');
  }


  const venue = await strapi.entityService.findOne('api::court.court', venueId, {
    populate: { tracks: true },
  });

  for (const track of venue.tracks) {
   const reservas = await strapi.entityService.findMany('api::reservation.reservation', {
      filters: {
        date,
        court: { id: track.id },
        start_time: normalizarHora(time),
      },
    });

    if (reservas.length === 0) {
      return track.id; // 🟢 disponible
    }
  }

  throw new Error('No hay canchas libres en ese horario');
};


function calcularHoraFinal(startTime, durationMinutes) {
  const [hour, minute] = startTime.split(':').map(Number);
  const totalMinutes = hour * 60 + minute + durationMinutes;
  const endH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const endM = String(totalMinutes % 60).padStart(2, '0');
  return `${endH}:${endM}`;
}

function normalizarHora(str) {
  return str.length === 5 ? `${str}:00.000` : str;
}