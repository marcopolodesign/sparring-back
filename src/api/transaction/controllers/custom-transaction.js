module.exports = {
    async getTransactionDetails(ctx) {
        const { date, courtIds } = ctx.query;
      
        try {
          // Fetch the reservations and populate the needed relations
          const reservations = await strapi.entityService.findMany('api::reservation.reservation', {
            filters: {
              date: date,
              court: {
                id: {
                  $in: courtIds.split(',').map(id => parseInt(id, 10)), // Ensure courtIds are parsed as integers
                },
              },
            },
            populate: {
              transactions: {
                populate: {
                  client: { fields: ['firstName', 'lastName', 'email'] },
                  seller: { fields: ['firstName', 'lastName'] },
                  products: {
                    populate: {
                      custom_price: { fields: ['custom_ammount'] },
                    },
                    fields: ['Name', 'type', 'price'],
                  },
                },
              },
            },
          });
      
          // Format the response
          const formattedTransactions = reservations.flatMap(reservation => {
            const { transactions } = reservation;
      
            if (!transactions || !transactions.length) return [];
      
            return transactions.map(transaction => {
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
                vendedor: transaction.seller
                  ? `${transaction.seller.firstName} ${transaction.seller.lastName}`.trim()
                  : 'Unknown Seller', 
                tipoProducto: productType,
                producto: productName,
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
          });
      
          // Send the response
          ctx.send(formattedTransactions);
        } catch (error) {
          console.error('Error fetching transaction details:', error);
          ctx.throw(500, 'Internal Server Error');
        }
      }
      
      
  };
  