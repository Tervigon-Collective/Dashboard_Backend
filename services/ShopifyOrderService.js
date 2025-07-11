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
    async fetchOrders(startDate, endDate, limit) {
        let hasNextPage = true;
        let endCursor = null;
        let orders = [];
        const queryTemplate = `
            query getOrders($query: String!, $first: Int!, $after: String) {
                orders(query: $query, first: $first, after: $after) {
                    edges {
                        node {
                            id
                            name
                            createdAt
                            processedAt
                            updatedAt
                            closedAt
                            totalPriceSet {
                                shopMoney {
                                    amount
                                    currencyCode
                                }
                            }
                            cancelledAt
                            shippingAddress {
                                city
                                province
                                country
                            }
                            lineItems(first: 10) {
                                edges {
                                    node {
                                        id
                                        title
                                        quantity
                                        originalUnitPriceSet {
                                            shopMoney {
                                                amount
                                                currencyCode
                                            }
                                        }
                                        variant {
                                            id
                                            title
                                            sku
                                            image {
                                                originalSrc
                                                altText
                                            }
                                            product {
                                                id
                                                title
                                                vendor
                                                handle
                                            }
                                        }
                                    }
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
            // If limit is set, only fetch up to the remaining needed
            const fetchCount = limit ? Math.min(250, limit - orders.length) : 250;
            if (limit && orders.length >= limit) break;
            const variables = {
                query: queryString,
                first: fetchCount, // Shopify max for best performance
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
            // Stop if we've reached the limit
            if (limit && orders.length >= limit) break;
        }
        // Only return up to the limit if set
        return limit ? orders.slice(0, limit) : orders;
    }

    // Aggregation example: total revenue, order count, average order value
    async getOrderStats(startDate, endDate) {
        const orders = await this.fetchOrders(startDate, endDate);
        const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalPriceSet.shopMoney.amount), 0);
        const orderCount = orders.length;
        const avgOrderValue = orderCount ? totalRevenue / orderCount : 0;
        return { orderCount, totalRevenue, avgOrderValue, currency: orders[0]?.totalPriceSet.shopMoney.currencyCode || 'INR' };
    }

    // Net revenue: sum of non-cancelled orders, with robust pagination
    async getNetRevenueStats(startDate, endDate) {
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
                            cancelledAt
                            customer {
                                defaultAddress {
                                    province
                                    provinceCode
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
        try {
            while (hasNextPage) {
                const variables = {
                    query: queryString,
                    first: 250,
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
                if (!response.data || !response.data.data || !response.data.data.orders) {
                    console.error('Shopify API error or unexpected response:', JSON.stringify(response.data, null, 2));
                    throw new Error('Shopify API did not return orders data');
                }
                const data = response.data.data.orders;
                orders = orders.concat(data.edges.map(edge => edge.node));
                hasNextPage = data.pageInfo.hasNextPage;
                endCursor = data.pageInfo.endCursor;
            }
        } catch (err) {
            console.error('Error fetching orders with pagination:', err.message);
            throw err;
        }
        // Now aggregate
        const netRevenue = orders
            .filter(order => order.cancelledAt == null)
            .reduce((sum, order) => sum + Number(order.totalPriceSet.shopMoney.amount), 0);
        const cancelledAmount = orders
            .filter(order => order.cancelledAt != null)
            .reduce((sum, order) => sum + Number(order.totalPriceSet.shopMoney.amount), 0);
        const totalSales = orders.reduce((sum, order) => sum + Number(order.totalPriceSet.shopMoney.amount), 0);
        const orderCount = orders.filter(order => order.cancelledAt == null).length;
        const avgOrderValue = orderCount ? netRevenue / orderCount : 0;
        return {
            orderCount,
            netRevenue,
            cancelledAmount,
            totalSales,
            avgOrderValue,
            currency: orders[0]?.totalPriceSet.shopMoney.currencyCode || 'INR'
        };
    }
}

module.exports = new ShopifyOrderService(); 