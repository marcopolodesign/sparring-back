// lifecycles.js - hooks del ciclo de vida para el modelo de reserva
module.exports = {
    async afterCreate(event) {
        const { result, params } = event;


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
            const transactionDetails = {
                reservation: result.id, // ID de la reserva recién creada
                client: params.data.owner, // ID del usuario asociado a la reserva (client)
                seller: params.data.seller, // ID del vendedor (la persona loggeada en Sparring Club)
                amount: amount, // Usar el precio obtenido del producto
                description: `Venta asociada a la reserva ${result.id}`,
                date: new Date().toISOString(),
                status: 'Pending', // Estado inicial de la transacción
                source: 'sparring-club',
                products: [productId], // Producto asociado a la reserva
            };

            // Validar que seller y products están presentes en la reserva
            if (!params.data.seller) {
                throw new Error('El vendedor (seller) debe ser proporcionado al crear una reserva.');
            }
            if (!params.data.products || params.data.products.length === 0) {
                throw new Error('Debe proporcionarse al menos un producto al crear una reserva.');
            }

            // Llamar al servicio de transacciones para crear la venta
            await strapi.service('api::transaction.transaction').create({
                data: transactionDetails,
            });

            // Registro en el log para confirmar que la transacción fue creada
            strapi.log.info(`Venta creada exitosamente para la reserva ${result.id}`);
        } catch (error) {
            strapi.log.error('Error creando la venta asociada a la reserva:', error);
        }
    },
};
