require('dotenv').config();
const express = require('express');
const os = require('os');

const cors = require('cors'); 
const { Pool } = require('pg');
const apiRoutes = require('./routes/apiRoutes');

// Initialize Express app
const app = express();
const port = process.env.PORT || 8080;




// CORS configuration
app.use(cors({
  origin: true, // Allow all origins (all IPs)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use('/api', apiRoutes);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false, // Set to false if using a self-signed certificate
  },
});
// Check database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client', err.stack);
  } else {
    console.log('Connected to the database');
    release();
  }
});

// Middleware to parse JSON
app.use(express.json());

//app running
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Fetch all product metrics (now from variants_tt joined with products_tt)
app.get('/product_metrics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        v.variant_title,
        v.sku as SKU_Name,
        v.price as Selling_Price,
        v.unit_cost as Cogs,
        p.title AS product_name
      FROM
        public.variants_tt AS v
      JOIN
        public.products_tt AS p
      ON
        v.product_id = p.product_id;
    `);

    // Calculate margin for each row and add it to the response
    const rowsWithMargin = result.rows.map(row => {
      // Margin = (Selling_Price - Cogs) / Selling_Price * 100 (as percent)
      const sellingPrice = parseFloat(row.selling_price ?? row.selling_Price);
      const cogs = parseFloat(row.cogs ?? row.Cogs);
      let margin = null;
      if (sellingPrice && !isNaN(sellingPrice) && !isNaN(cogs) && sellingPrice !== 0) {
        margin = (sellingPrice - cogs);
      }
      return {
        ...row,
        margin: margin !== null ? Number(margin.toFixed(2)) : null
      };
    });

    res.json(rowsWithMargin);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Create a new product variant (product metric)
app.post('/product_metrics', async (req, res) => {
  const { product_name, variant_title, sku_name, selling_price, cogs } = req.body;
  try {
    // Find product_id from products_tt by product_name
    const productResult = await pool.query(
      'SELECT product_id FROM products_tt WHERE title = $1',
      [product_name]
    );
    if (productResult.rows.length === 0) {
      return res.status(400).send('Product not found');
    }
    const product_id = productResult.rows[0].product_id;
    // Insert into variants_tt
    const result = await pool.query(
      'INSERT INTO variants_tt (product_id, variant_title, sku, price, unit_cost) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [product_id, variant_title, sku_name, selling_price, cogs]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating product variant');
  }
});

// Update an existing product variant (by SKU)
app.put('/product_metrics/:sku_name', async (req, res) => {
  const { sku_name } = req.params;
  const { product_name, variant_title, selling_price, cogs } = req.body;
  try {
    // Find product_id from products_tt by product_name
    const productResult = await pool.query(
      'SELECT product_id FROM products_tt WHERE title = $1',
      [product_name]
    );
    if (productResult.rows.length === 0) {
      return res.status(400).send('Product not found');
    }
    const product_id = productResult.rows[0].product_id;
    // Update variants_tt
    const result = await pool.query(
      'UPDATE variants_tt SET product_id = $1, variant_title = $2, price = $3, unit_cost = $4 WHERE sku = $5 RETURNING *',
      [product_id, variant_title, selling_price, cogs, sku_name]
    );
    if (result.rows.length === 0) {
      return res.status(404).send('Product variant not found');
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating product variant');
  }
});

// Delete a product variant (by SKU)
app.delete('/product_metrics/:sku_name', async (req, res) => {
  const { sku_name } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM variants_tt WHERE sku = $1 RETURNING *',
      [sku_name]
    );
    if (result.rows.length === 0) {
      return res.status(404).send('Product variant not found');
    }
    res.send('Product variant deleted');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting product variant');
  }
});

// Start the server
app.listen(port, () => {
  // Get the local network IP address
  const interfaces = os.networkInterfaces();
  let localIp = 'localhost';
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIp = iface.address;
        break;
      }
    }
  }
  console.log(`Server running on http://${localIp}:${port}`);
});


