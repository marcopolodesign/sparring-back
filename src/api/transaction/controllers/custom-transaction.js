module.exports = {
    async getTransactionDetails(ctx) {
        const { date, venueId } = ctx.query;
        console.log('date', date);
        console.log('venueId', venueId);
        try {
            // Calculate the start and end of the day for the given date
            const startOfDay = new Date(date);
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setUTCHours(23, 59, 59, 999);

            // Fetch the transactions directly associated with the venue and date range
            const transactions = await strapi.entityService.findMany('api::transaction.transaction', {
                filters: {
                    date: {
                        $gte: startOfDay.toISOString(), // Match from the start of the day
                        $lte: endOfDay.toISOString(),  // Match until the end of the day
                    },
                    venue: {
                        id: parseInt(venueId, 10), // Ensure venueId is parsed as an integer
                    },
                },
                populate: {
                    client: { fields: ['firstName', 'lastName', 'email'] },
                    seller: { fields: ['firstName', 'lastName', 'id'] },
                    products: {
                        populate: {
                            custom_price: { fields: ['custom_ammount'] },
                        },
                        fields: ['Name', 'type', 'price'],
                    },
                    reservation: { fields: ['id'] }, // Populate reservation
                },
            });

            console.log('transactions', transactions);

            // Format the transactions
            const formattedTransactions = transactions.map((transaction) => {
                const products = transaction.products || [];
                let productName = 'Unknown';
                let productType = 'Unknown';
                let productPrice = 0;

                if (products.length > 0) {
                    const product = products[0];
                    productName = product.Name;
                    productType = product.type;

                    if (product.custom_price?.length > 0) {
                        productPrice = product.custom_price[0].custom_ammount;
                    } else {
                        productPrice = product.price;
                    }
                }

                const totalAmount = transaction.amount || productPrice;

                return {
                    id: Number(transaction.id), // 🔐 Ensure number
                    clienteId: transaction.client?.id,
                    cliente: transaction.client?.firstName
                        ? `${transaction.client.firstName} ${transaction.client.lastName}`.trim()
                        : transaction.client?.email || 'Desconocido',
                    vendedorId: transaction.seller?.id,
                    vendedor: transaction.seller
                        ? `${transaction.seller.firstName} ${transaction.seller.lastName}`.trim()
                        : 'Unknown Seller',
                    tipoProducto: productType,
                    producto: productName,
                    productoId: products[0]?.id,
                    metodoPago: transaction.payment_method || 'N/A',
                    descuento: transaction.discounts ? `${transaction.discounts}%` : '0%',
                    total: totalAmount ? `$${totalAmount.toLocaleString()}` : '$0',
                    fecha: new Date(transaction.date).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    estado: transaction.status ? transaction.status.toUpperCase() : 'N/A',
                    reserva: transaction.reservation?.id || null, // Include reservation ID
                };
            });

            // Send the response
            ctx.send(formattedTransactions);
        } catch (error) {
            console.error('Error fetching transaction details:', error);
            ctx.throw(500, 'Internal Server Error');
        }
    },

    async getTransactionsByReservation(ctx) {
        const { reservationId } = ctx.query;

        try {
            // Ensure the reservationId is provided
            if (!reservationId) {
                ctx.throw(400, 'Reservation ID is required');
            }

            // Fetch the transactions associated with the reservation
            const reservationTransactions = await strapi.entityService.findMany('api::transaction.transaction', {
                filters: {
                    reservation: {
                        id: parseInt(reservationId, 10), // Ensure reservationId is parsed as an integer
                    },
                },
                populate: {
                    client: { fields: ['firstName', 'lastName', 'email'] },
                    seller: { fields: ['firstName', 'lastName', 'id'] },
                    products: {
                        populate: {
                            custom_price: { fields: ['custom_ammount'] },
                        },
                        fields: ['Name', 'type', 'price'],
                    },
                },
            });

            // Format the response
            const formattedTransactions = reservationTransactions.map((transaction) => {
                // Extract product data
                const products = transaction.products || [];
                let productName = 'Unknown';
                let productType = 'Unknown';
                let productPrice = 0;

                if (products.length > 0) {
                    const product = products[0];
                    productName = product.Name;
                    productType = product.type;

                    // Check for custom price first
                    if (product.custom_price.length > 0) {
                        productPrice = product.custom_price[0].custom_ammount;
                    } else {
                        productPrice = product.price;
                    }
                }

                // Calculate total using transaction amount or derived product price
                const totalAmount = transaction.amount ? transaction.amount : productPrice;

                return {
                    id: String(transaction.id),
                    cliente: transaction.client.firstName
                        ? `${transaction.client.firstName} ${transaction.client.lastName}`.trim()
                        : transaction.client.email,
                    vendedorId: transaction.seller.id,
                    vendedor: transaction.seller
                        ? `${transaction.seller.firstName} ${transaction.seller.lastName}`.trim()
                        : 'Unknown Seller',
                    tipoProducto: productType,
                    producto: productName,
                    productoId: products[0]?.id,
                    metodoPago: transaction.payment_method || 'N/A',
                    descuento: transaction.discounts ? `${transaction.discounts}%` : '0%',
                    total: totalAmount ? `$${totalAmount.toLocaleString()}` : '$0',
                    fecha: new Date(transaction.date).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    estado: transaction.status ? transaction.status.toUpperCase() : 'N/A',
                };
            });

            // Send the response
            ctx.send(formattedTransactions);
        } catch (error) {
            console.error('Error fetching transactions by reservation:', error);
            ctx.throw(500, 'Internal Server Error');
        }
    },
};
