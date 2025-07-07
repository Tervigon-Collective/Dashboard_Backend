require('dotenv').config();
const express = require('express');

const cors = require('cors'); 
const { Pool } = require('pg');
const apiRoutes = require('./routes/apiRoutes');

// Initialize Express app
const app = express();
const port = 3001;




// CORS configuration
app.use(cors({
  origin: ['https://sku-management-webapp.windsurf.build', 'https://warehousing-z9wl.onrender.com', 'http://localhost:3000'],
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

// Fetch all product metrics
app.get('/product_metrics', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM product_metrics');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Create a new product metric
app.post('/product_metrics', async (req, res) => {
  const { product_name, size, sku_name, selling_price, per_bottle_cost, net_margin } = req.body; 
  try {
    const result = await pool.query(
      'INSERT INTO product_metrics (product_name, size, sku_name, selling_price, per_bottle_cost, net_margin) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [product_name, size, sku_name, selling_price, per_bottle_cost, net_margin]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating product metric');
  }
});



// Update an existing product metric
app.put('/product_metrics/:sku_name', async (req, res) => {
  const { sku_name } = req.params;
  const { product_name, size, selling_price, per_bottle_cost, net_margin } = req.body;
  try {
    const result = await pool.query(
      'UPDATE product_metrics SET product_name = $1, size = $2, selling_price = $3, per_bottle_cost = $4, net_margin = $5 WHERE sku_name = $6 RETURNING *',
      [product_name, size, selling_price, per_bottle_cost, net_margin, sku_name]
    );
    if (result.rows.length === 0) {
      return res.status(404).send('Product metric not found');
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating product metric');
  }
});

// Delete a product metric
app.delete('/product_metrics/:sku_name', async (req, res) => {
  const { sku_name } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM product_metrics WHERE sku_name = $1 RETURNING *',
      [sku_name]
    );
    if (result.rows.length === 0) {
      return res.status(404).send('Product metric not found');
    }
    res.send('Product metric deleted');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting product metric');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
// GOOD (accessible from your local network)
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://192.168.1.45:${port}`);
});


