const axios = require('axios');

class ShopifyOrderService {
    constructor() {
        this.shopifyDomain = process.env.SHOPIFY_STORE;
        this.shopifyToken = process.env.SHOPIFY_PASSWORD;
    }

    // Helper to build date range query string
    // startDate and endDate should be in the format 'YYYY-MM-DDT00:00:00Z' and 'YYYY-MM-DDT23:59:59Z'
    buildDateRangeQuery(startDate, endDate) {
        return `created_at:>=${startDate} created_at:<=${endDate}`;
    }

    // Main fetcher with pagination and field limiting
    async fetchOrders(startDate, endDate) {
        let hasNextPage = true;
        let endCursor = null;
        let orders = [];
        const queryTemplate = `
            query getOrders($query: String!, $first: Int!, $after: String) {
                orders(query: $query, first: $first, after: $after) {
                    edges {
                        node {
                            id
                            createdAt
                            totalPriceSet {
                                shopMoney {
                                    amount
                                    currencyCode
                                }
                            }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `;
        
        const queryString = this.buildDateRangeQuery(startDate, endDate);

        while (hasNextPage) {
            const variables = {
                query: queryString,
                first: 250, // Shopify max for best performance
                after: endCursor
            };
            const response = await axios.post(
                `https://${this.shopifyDomain}/admin/api/2023-10/graphql.json`,
                { query: queryTemplate, variables },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Shopify-Access-Token': this.shopifyToken
                    }
                }
            );
            const data = response.data.data.orders;

            orders = orders.concat(data.edges.map(edge => edge.node));
            hasNextPage = data.pageInfo.hasNextPage;
            endCursor = data.pageInfo.endCursor;
        }
        return orders;
    }

    // Aggregation example: total revenue, order count, average order value
    async getOrderStats(startDate, endDate) {
        const orders = await this.fetchOrders(startDate, endDate);
        const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalPriceSet.shopMoney.amount), 0);
        const orderCount = orders.length;
        const avgOrderValue = orderCount ? totalRevenue / orderCount : 0;
        return { orderCount, totalRevenue, avgOrderValue, currency: orders[0]?.totalPriceSet.shopMoney.currencyCode || 'INR' };
    }
}

module.exports = new ShopifyOrderService(); 