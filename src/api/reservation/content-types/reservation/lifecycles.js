// lifecycles.js - hooks del ciclo de vida para el modelo de reserva
const DAYS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MONTHS = [
  'enero','febrero','marzo','abril','mayo',
  'junio','julio','agosto','septiembre','octubre',
  'noviembre','diciembre'
];

function formatSpanishDate(date) {
  const weekday = DAYS[date.getDay()];
  const day = date.getDate();
  // sólo el día 1º ponemos "1ro"
  const dayStr = (day === 1 ? '1ro' : day);
  const month = MONTHS[date.getMonth()];
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${weekday} ${dayStr} de ${month} ${hh}:${mm}`;
}


module.exports = {
    async afterCreate(event) {
        const { result, params } = event;


        // const userId = params.context?.state?.user?.id || null;
        const when = formatSpanishDate(new Date());
        // 1) Log the reservation creation
        await strapi.entityService.create('api::log-entry.log-entry', {
          data: {
            action: 'reservation.created',
            description: `Reserva #${result.id} creada por el usuario ${params.data.seller} para el cliente ${params.data.owner} el ${when}`,
            timestamp: new Date(),
            user: params.data.owner,
            reservation: result.id,
            
          },
        });

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
                    custom_price: {
                        populate: ['venue'], // Populate venue dentro de custom_price
                    },
                    venues: true, // También popular las venues asociadas al producto
                },
            });

            // console.log(product, 'PRODUCTO');

            if (!product) {
                throw new Error(`No se pudo encontrar el producto con ID: ${productId}`);
            }

            // Obtener el ID de la sede (venue) desde la cancha (court) de la reserva
            const courtId = params.data.court;
            const court = await strapi.entityService.findOne('api::track.track', courtId, {
                populate: ['venue'],
            });

            // console.log(court, 'COURT');

            if (!court || !court.venue) {
                throw new Error('No se pudo encontrar la sede (venue) asociada a la cancha de la reserva.');
            }

            const venueId = court.venue.id; // ID de la sede (venue) asociada a la reserva
            console.log(venueId, 'VENUE ID');

            // Determinar el precio del producto
            let amount = product.price;

            // Verificar si hay un custom_price para la sede de la reserva
            const customPrice = product.custom_price.find(
                (price) => price.venue?.id === venueId && price.custom_ammount
            );

            // console.log(customPrice, 'CUSTOM PRICE');

            if (customPrice) {
                amount = customPrice.custom_ammount;
            }

            // Crear los detalles de la transacción basados en la reserva recién creada
            const transactionDate = `${params.data.date}T${params.data.start_time}`;
            const transactionDetails = {
                reservation: result.id, // ID de la reserva recién creada
                client: params.data.owner, // ID del usuario asociado a la reserva (client)
                seller: params.data.seller, // ID del vendedor (la persona loggeada en Sparring Club)
                amount: amount, // Usar el precio obtenido del producto
                description: `Venta asociada a la reserva ${result.id}`,
                date: transactionDate, // Usar la fecha y hora de la reserva
                status: 'Pending', // Estado inicial de la transacción
                source: 'sparring-club',
                products: [productId], // Producto asociado a la reserva
                venue: venueId, // Agregar el ID de la sede (venue)
            };

            // Validar que seller y products están presentes en la reserva
            if (!params.data.seller) {
                throw new Error('El vendedor (seller) debe ser proporcionado al crear una reserva.');
            }
            if (!params.data.products || params.data.products.length === 0) {
                throw new Error('Debe proporcionarse al menos un producto al crear una reserva.');
            }

            // // Llamar al servicio de transacciones para crear la venta
          
            const tx = await strapi.service('api::transaction.transaction').create(
                {
                  data: transactionDetails,
                },
             
              );
          
              // 3) Log the transaction creation
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

            // Registro en el log para confirmar que la transacción fue creada
            strapi.log.info(`Venta creada exitosamente para la reserva ${result.id}`);
        } catch (error) {
            strapi.log.error('Error creando la venta asociada a la reserva:', error);
        }
    },

    async afterUpdate(event) {
        const { result, params } = event;

        const when = formatSpanishDate(new Date());
        try {
            // Obtener el ID del producto asociado a la reserva
            const productId = params.data.products[0];

            if (!productId) {
                throw new Error('No se encontró un producto asociado a la reserva.');
            }

            // Obtener el producto desde la base de datos, incluyendo el custom_price y venues
            const product = await strapi.entityService.findOne('api::product.product', productId, {
                populate: {
                    custom_price: {
                        populate: ['venue'], // Populate venue dentro de custom_price
                    },
                    venues: true, // También popular las venues asociadas al producto
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

            const venueId = court.venue.id; // ID de la sede (venue) asociada a la reserva

            // Determinar el precio del producto
            let amount = product.price;

            // Verificar si hay un custom_price para la sede de la reserva
            const customPrice = product.custom_price.find(
                (price) => price.venue?.id === venueId && price.custom_ammount
            );

            if (customPrice) {
                amount = customPrice.custom_ammount;
            }

            // Buscar la transacción asociada a la reserva
            const transaction = await strapi.entityService.findMany('api::transaction.transaction', {
                filters: { reservation: result.id },
            });

            if (!transaction || transaction.length === 0) {
                throw new Error(`No se encontró una transacción asociada a la reserva ${result.id}`);
            }

            const transactionId = transaction[0].id;

            // Actualizar los detalles de la transacción con el nuevo producto
            await strapi.entityService.update('api::transaction.transaction', transactionId, {
                data: {
                    products: [productId], // Actualizar el producto asociado
                    amount: amount, // Actualizar el monto si es necesario
                },
            });

            // Handle case when reservation status changes to "cancelled"
            if (result.status === "cancelled") {
                // Buscar todas las transacciones asociadas a la reserva
                const transactions = await strapi.entityService.findMany('api::transaction.transaction', {
                    filters: { reservation: result.id },
                });

                // Marcar cada transacción como "Cancelled"
                for (const transaction of transactions) {
                    await strapi.entityService.update('api::transaction.transaction', transaction.id, {
                        data: {
                            status: "Cancelled",
                        },
                    });
                }

                strapi.log.info(`Transacciones asociadas a la reserva #${result.id} marcadas como "Cancelled".`);
            }

            // Log the transaction update
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

            // Registro en el log para confirmar que la transacción fue actualizada
            strapi.log.info(`Transacción actualizada exitosamente para la reserva ${result.id}`);
        } catch (error) {
            strapi.log.error('Error actualizando la transacción asociada a la reserva:', error);
        }
    },
};
