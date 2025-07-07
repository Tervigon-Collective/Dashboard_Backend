const pool = require('../database/db');

/**
 * Retrieve last N days of net profit from shopify_net_profit_daily table
 * @param {number} n - Number of days
 * @returns {Promise<Array<{date: string, net_profit: number}>>}
 */
async function getLastNDaysNetProfit(n) {
  // Postgres query to get last N days of net profit, excluding today, with date as string
  const query = {
    text: `
      SELECT date::text AS date, net_profit
      FROM shopify_net_profit_daily
      WHERE date < CURRENT_DATE
      ORDER BY date DESC
      LIMIT $1
    `,
    values: [n]
  };
  const { rows } = await pool.query(query);
  return rows;
}

/**
 * Controller to get last N days net profit from shopify_net_profit_daily
 * GET /net_profit_daily?n=7
 */
const getLastNDaysNetProfitController = async (req, res) => {
  try {
    const n = parseInt(req.query.n, 10) || 7;
    const data = await getLastNDaysNetProfit(n);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch net profit for last N days', details: error.message });
  }
};

module.exports.getLastNDaysNetProfit = getLastNDaysNetProfit;
module.exports.getLastNDaysNetProfitController = getLastNDaysNetProfitController;
