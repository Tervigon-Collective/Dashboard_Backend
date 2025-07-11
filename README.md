# Seleric Dashboard Backend API

This backend provides RESTful API endpoints for order analytics, sales, COGS, ad spend, product metrics, and more, primarily for Shopify and marketing data.

## Base URL

- For API endpoints: `http://<host>:<port>/api/`
- For product metrics: `http://<host>:<port>/product_metrics`

---

## API Endpoints

### Orders & Sales Analytics

#### `GET /api/orders/:timeframe`
- **Description:** Get order stats for a given timeframe.
- **Params:**
  - `:timeframe` (path): `today`, `week`, `month`, `year`, or `custom`
  - If `custom`, use `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- **Response:**
  - `{ orderCount, totalRevenue, avgOrderValue, currency }`

#### `GET /api/net_sales/:timeframe`
- **Description:** Get net sales, ad spend, and revenue breakdown for a timeframe (per day or per month).
- **Params:**
  - `:timeframe` (path): `today`, `week`, `month`, `year`, or `custom`
  - If `custom`, use `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  - `n` (query, optional): Number of days (default: 7)
- **Response:**
  - Array of daily/monthly objects: `{ date/month, spend, revenue, cancelledAmount, totalSales, net }`

#### `GET /api/latest_orders`
- **Description:** Get the latest N orders (default 10, up to 90 days back).
- **Params:**
  - `n` (query, optional): Number of orders to return
- **Response:**
  - Array of orders, each with fields like `id`, `name`, `createdAt`, `createdAtIST`, `region`, `skus` (array of `{ sku, quantity }`), and more.

#### `GET /api/top_skus_by_sales`
- **Description:** Get top N SKUs by sales amount for a date range.
- **Params:**
  - `n` (query, optional): Number of SKUs (default 10)
  - `date` or `start_date`/`end_date` (query): Date or range
- **Response:**
  - Array: `[ { sku, total_sales } ]`

#### `GET /api/order_count`
- **Description:** Get order and item count breakdown by source for a date range.
- **Params:**
  - `startDate`, `endDate` (query, optional): Defaults to today
- **Response:**
  - `{ orderCount, totalQuantity, metaQuantity, googleQuantity, organicQuantity }`

#### `GET /api/order_count_by_province`
- **Description:** Get order count per province for a date or date range.
- **Params:**
  - `date` or `start_date`/`end_date` (query)
- **Response:**
  - Array: `[ { province, order_quantity } ]`

#### `GET /api/order_sales_by_province`
- **Description:** Get total sales per province for a date or date range.
- **Params:**
  - `date` or `start_date`/`end_date` (query)
- **Response:**
  - Array: `[ { province, total_sales } ]`

### Financial Metrics

#### `GET /api/sales`
- **Description:** Get total sales breakdown for a date range.
- **Params:**
  - `startDate`, `endDate` (query, optional): Defaults to today
- **Response:**
  - `{ metaSales, googleSales, organicSales, totalSales }`

#### `GET /api/cogs`
- **Description:** Get total cost of goods sold (COGS) breakdown for a date range.
- **Params:**
  - `startDate`, `endDate` (query, optional): Defaults to today
- **Response:**
  - `{ metaCogs, googleCogs, totalCogs }`

#### `GET /api/ad_spend`
- **Description:** Get total ad spend (Google + Facebook) for a date range.
- **Params:**
  - `startDate`, `endDate` (query, optional): Defaults to today
- **Response:**
  - `{ googleSpend, facebookSpend, totalSpend }`

#### `GET /api/net_profit`
- **Description:** Get net profit (sales - COGS - ad spend) for a date range.
- **Params:**
  - `startDate`, `endDate` (query, optional): Defaults to today
- **Response:**
  - `{ metaNetProfit, googleNetProfit, totalNetProfit }`

#### `GET /api/roas`
- **Description:** Get Return on Ad Spend (ROAS) for Meta, Google, and total, for a date range.
- **Params:**
  - `startDate`, `endDate` (query, optional): Defaults to today
- **Response:**
  - `{ meta: { grossRoas, netRoas, beRoas }, google: {...}, total: {...} }`

#### `GET /api/net_profit_daily`
- **Description:** Get last N days of net profit from the database.
- **Params:**
  - `n` (query, optional): Number of days (default 7)
- **Response:**
  - Array: `[ { date, net_profit } ]`

---

## Product Metrics Endpoints

### `GET /product_metrics`
- **Description:** Get all product metrics.
- **Response:**
  - Array of product metric objects.

### `POST /product_metrics`
- **Description:** Create a new product metric.
- **Body:**
  - `{ product_name, size, sku_name, selling_price, per_bottle_cost, net_margin }`
- **Response:**
  - Created product metric object.

### `PUT /product_metrics/:sku_name`
- **Description:** Update a product metric by SKU.
- **Body:**
  - `{ product_name, size, selling_price, per_bottle_cost, net_margin }`
- **Response:**
  - Updated product metric object.

### `DELETE /product_metrics/:sku_name`
- **Description:** Delete a product metric by SKU.
- **Response:**
  - Success message or 404 if not found.

---

## Notes
- All endpoints return JSON.
- For date ranges, use `YYYY-MM-DD` format.
- Some endpoints require Shopify, Google, or Facebook API credentials in environment variables.
- For more details, see the controller code in `backend/controller/apiController.js`. 