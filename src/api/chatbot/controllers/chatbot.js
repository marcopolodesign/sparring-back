'use strict';

module.exports = {
  async handleFlow(ctx) {
    const { step, venue_name, date, time, duration_minutes, activity = 'padel', user_name, email } = ctx.request.body;

    let venue = null;
    let venueId = null;
    let matchedProduct = null;

    try {
      if (step === 'create_user') {
        if (!email || !user_name) {
          return ctx.send({
            message: 'Por favor, proporcioná tu nombre y correo electrónico para crear tu cuenta.',
          });
        }

        // Verificar si el usuario ya existe
        const existingUser = await strapi.entityService.findMany('plugin::users-permissions.user', {
          filters: { email },
        });

        if (existingUser.length > 0) {
          return ctx.send({
            message: `Ya existe una cuenta asociada al correo ${email}.`,
          });
        }

        // Crear el usuario
        const newUser = await strapi.entityService.create('plugin::users-permissions.user', {
          data: {
            username: user_name,
            email,
            password: 'defaultPassword123', // Generar una contraseña segura o pedirla al usuario
            confirmed: true,
          },
        });

        return ctx.send({
          message: `¡Cuenta creada exitosamente! Bienvenido, ${user_name}.`,
          user_id: newUser.id,
        });
      }

      if (step === 'check_availability') {
        const venues = await strapi.entityService.findMany('api::court.court', {
          filters: { name: { $containsi: venue_name } },
        });

        venue = venues?.[0];
        if (!venue) {
          return ctx.send({ message: `No encontré un lugar llamado ${venue_name}.` });
        }

        venueId = venue.id;

        if (!time) {
          const availability = await strapi
            .service('api::reservation.custom-reservation')
            .checkAvailabilityWithinPeriodBot({ venueId, date });

          const times = availability.venueAvailability;

          const message = times.length
            ? `En ${venue.name}, para el ${date}, hay disponibilidad a las siguientes horas: ${times.join(', ')}. ¿Querés reservar alguna?`
            : `No hay horarios disponibles en ${venue.name} para el ${date}.`;

          return ctx.send({ message });
        }

        return ctx.send({
          message: `Perfecto, ${venue.name} es una sede válida. ¿Para qué día y a qué hora querés reservar una cancha de pádel?`,
        });
      }

      if (step === 'get_price') {
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

        const rentals = await strapi
          .service('api::product.custom-product')
          .getVenueRentals(venue.id);

        const expectedName = `Pádel ${duration_minutes || 90} minutos`;
        let selectedProduct = rentals.find(
          (p) => p.name?.trim().toLowerCase() === expectedName.toLowerCase()
        );

        if (!selectedProduct) {
          selectedProduct = rentals.find(
            (p) => p.name?.trim().toLowerCase() === 'pádel 90 minutos'
          );
        }

        if (!selectedProduct) {
          return ctx.send({
            message: `No encontré un producto disponible para reservar.`,
          });
        }

        const price = selectedProduct.customPrice || selectedProduct.defaultPrice;

        return ctx.send({
          message: `Perfecto, el precio para reservar en ${venue.name} por ${duration_minutes || 90} minutos es de $${price}. ¿A nombre de quién hacemos la reserva?`,
        });
      }

      if (step === 'confirm_booking') {
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

        if (!matchedProduct && activity && duration_minutes) {
          const tag = `${activity}-${duration_minutes}`;
          const products = await strapi.entityService.findMany('api::product.product', {
            filters: { sku: { $eq: tag } },
          });
          matchedProduct = products?.[0];
        }

        const trackId = await seleccionarCanchaDisponible(venueId, date, time);

        const reservation = await strapi.entityService.create('api::reservation.reservation', {
          data: {
            owner: 74,
            seller: 74,
            date,
            start_time: normalizarHora(time),
            end_time: normalizarHora(calcularHoraFinal(time, duration_minutes)),
            court: trackId,
            venue: venueId,
            products: matchedProduct ? [matchedProduct.id] : [],
            type: 'alquiler',
            duration: duration_minutes,
            status: 'pending_payment',
            notes: `Reservado por ${user_name} a través de chatbot`,
          },
        });

        return ctx.send({
          message: `¡Listo! Reservamos a nombre de ${user_name} para el ${date} a las ${time}. Te esperamos 🥊`,
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
      return track.id;
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