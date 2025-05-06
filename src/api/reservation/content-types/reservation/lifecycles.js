// lifecycles.js - hooks del ciclo de vida para el modelo de reserva
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo',
  'junio', 'julio', 'agosto', 'septiembre', 'octubre',
  'noviembre', 'diciembre'
];

function formatSpanishDate(date) {
  const weekday = DAYS[date.getDay()];
  const day = date.getDate();
  const dayStr = (day === 1 ? '1ro' : day); // sólo el día 1º ponemos "1ro"
  const month = MONTHS[date.getMonth()];
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${weekday} ${dayStr} de ${month} ${hh}:${mm}`;
}

module.exports = {
  async afterCreate(event) {
    const { result, params } = event;
    const when = formatSpanishDate(new Date());

    // Check if a log entry for reservation.created already exists
    const existingReservationLog = await strapi.entityService.findMany('api::log-entry.log-entry', {
      filters: {
        action: 'reservation.created',
        reservation: result.id,
      },
      limit: 1,
    });

    if (existingReservationLog.length === 0) {
      await strapi.entityService.create('api::log-entry.log-entry', {
        data: {
          action: 'reservation.created',
          description: `Reserva #${result.id} creada por el usuario ${params.data.seller} para el cliente ${params.data.owner} el ${when}`,
          timestamp: new Date(),
          user: params.data.owner,
          reservation: result.id,
        },
      });
      console.log(`Log entry created for reservation.created: Reservation #${result.id}`);
    } else {
      console.log(`Log entry for reservation.created already exists for Reservation #${result.id}. Skipping.`);
    }

    // Check if a transaction already exists for this reservation
    const existingTransaction = await strapi.entityService.findMany('api::transaction.transaction', {
      filters: { reservation: result.id },
      limit: 1,
    });

    if (existingTransaction.length > 0) {
      strapi.log.info(`Transaction already exists for reservation #${result.id}. Skipping transaction creation.`);
      return; // Skip transaction creation
    }

    if (Array.isArray(params.data.products)) {
      params.data.products.forEach(async (productId) => {
        const product = await strapi.entityService.findOne('api::product.product', productId);
        console.log(product?.sku, 'PRODUCT SKU');
      });
    }

    try {
      // Obtener el ID del producto asociado a la reserva
      const productId = params.data.products[0];

      if (!productId) {
        throw new Error('No se encontró un producto asociado a la reserva.');
      }

      // Obtener el producto desde la base de datos, incluyendo el custom_price y venues
      const product = await strapi.entityService.findOne('api::product.product', productId, {
        populate: {
          custom_price: { populate: ['venue'] },
          venues: true,
        },
      });

      if (!product) {
        throw new Error(`No se pudo encontrar el producto con ID: ${productId}`);
      }

      // Obtener el ID de la sede (venue) desde la cancha (court) de la reserva
      const courtId = params.data.court;
      const court = await strapi.entityService.findOne('api::track.track', courtId, {
        populate: ['venue'],
      });

      if (!court || !court.venue) {
        throw new Error('No se pudo encontrar la sede (venue) asociada a la cancha de la reserva.');
      }

      const venueId = court.venue.id;
      console.log(venueId, 'VENUE ID');

      // Determinar el precio del producto
      let amount = product.price;
      const customPrice = product.custom_price.find(
        (price) => price.venue?.id === venueId && price.custom_ammount
      );

      if (customPrice) {
        amount = customPrice.custom_ammount;
      }

      // Crear los detalles de la transacción basados en la reserva recién creada
      const transactionDate = `${params.data.date}T${params.data.start_time}`;
      const transactionDetails = {
        reservation: result.id,
        client: params.data.owner,
        seller: params.data.seller,
        amount: amount,
        description: `Venta asociada a la reserva ${result.id}`,
        date: transactionDate,
        status: 'Pending',
        source: 'sparring-club',
        products: [productId],
        venue: venueId,
      };

      if (!params.data.seller) {
        throw new Error('El vendedor (seller) debe ser proporcionado al crear una reserva.');
      }
      if (!params.data.products || params.data.products.length === 0) {
        throw new Error('Debe proporcionarse al menos un producto al crear una reserva.');
      }

      const tx = await strapi.service('api::transaction.transaction').create({
        data: transactionDetails,
      });

      // Check if a log entry for transaction.created already exists
      const existingTransactionLog = await strapi.entityService.findMany('api::log-entry.log-entry', {
        filters: {
          action: 'transaction.created',
          transaction: tx.id,
        },
        limit: 1,
      });

      if (existingTransactionLog.length > 0) {
        strapi.log.info(`Log entry for transaction.created already exists for Transaction #${tx.id}. Skipping log creation.`);
        return;
      }

      // Log the transaction creation
      await strapi.entityService.create('api::log-entry.log-entry', {
        data: {
          action: 'transaction.created',
          description: `Transaction #${tx.id} creada para la reserva #${result.id}, por un total de ${transactionDetails.amount} el ${when}`,
          timestamp: new Date(),
          user: params.data.owner,
          reservation: result.id,
          transaction: tx.id,
        },
      });

      strapi.log.info(`Venta creada exitosamente para la reserva ${result.id}`);
    } catch (error) {
      strapi.log.error('Error creando la venta asociada a la reserva:', error);
    }
  },

  async afterUpdate(event) {
    const { result, params } = event;
    console.log(event, 'EVENTO afterUpdate lifecycle reservation');
    const when = formatSpanishDate(new Date());

    try {
      if (!Array.isArray(params.data.products) || params.data.products.length === 0) {
        strapi.log.info(`No products found for reservation #${result.id}. Skipping transaction update.`);
        return;
      }

      const productId = params.data.products[0];
      const product = await strapi.entityService.findOne('api::product.product', productId, {
        populate: {
          custom_price: { populate: ['venue'] },
          venues: true,
        },
      });

      if (!product) {
        throw new Error(`No se pudo encontrar el producto con ID: ${productId}`);
      }

      const courtId = params.data.court;
      const court = await strapi.entityService.findOne('api::track.track', courtId, {
        populate: ['venue'],
      });

      if (!court || !court.venue) {
        throw new Error('No se pudo encontrar la sede (venue) asociada a la cancha de la reserva.');
      }

      const venueId = court.venue.id;
      let amount = product.price;
      const customPrice = product.custom_price.find(
        (price) => price.venue?.id === venueId && price.custom_ammount
      );

      if (customPrice) {
        amount = customPrice.custom_ammount;
      }

      const transaction = await strapi.entityService.findMany('api::transaction.transaction', {
        filters: { reservation: result.id },
      });

      if (!transaction || transaction.length === 0) {
        throw new Error(`No se encontró una transacción asociada a la reserva ${result.id}`);
      }

      const transactionId = transaction[0].id;

      await strapi.entityService.update('api::transaction.transaction', transactionId, {
        data: {
          products: [productId],
          amount: amount,
        },
      });

      if (result.status === "cancelled") {
        const transactions = await strapi.entityService.findMany('api::transaction.transaction', {
          filters: { reservation: result.id },
        });

        for (const transaction of transactions) {
          await strapi.entityService.update('api::transaction.transaction', transaction.id, {
            data: { status: "Cancelled" },
          });
        }

        strapi.log.info(`Transacciones asociadas a la reserva #${result.id} marcadas como "Cancelled".`);

        await strapi.entityService.create('api::log-entry.log-entry', {
          data: {
            action: 'transaction.cancelled',
            description: `All transactions associated with Reservation #${result.id} have been marked as "Cancelled".`,
            timestamp: new Date(),
            user: params.data.owner,
            reservation: result.id,
          },
        });
      }

      await strapi.entityService.create('api::log-entry.log-entry', {
        data: {
          action: 'transaction.updated',
          description: `Transaction #${transactionId} actualizada para la reserva #${result.id}, con el producto actualizado y un total de ${amount} el ${when}`,
          timestamp: new Date(),
          user: params.data.owner,
          reservation: result.id,
          transaction: transactionId,
        },
      });

      strapi.log.info(`Transacción actualizada exitosamente para la reserva ${result.id}`);
    } catch (error) {
      strapi.log.error('Error actualizando la transacción asociada a la reserva en lifecyle:', error);
    }
  },
};
