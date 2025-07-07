const express = require("express");
const router = express.Router();
const { getAllAdSpend, getTotalCogs, getNetProfit, getTotalSales, getOrderCount, getRoas } = require("../controller/apiController");
const apiController = require('../controller/apiController');

router.get("/ad_spend", getAllAdSpend);
router.get("/cogs", getTotalCogs);
router.get("/net_profit", getNetProfit);
router.get("/order_count", getOrderCount);
router.get("/sales", getTotalSales);
router.get("/roas" , getRoas)
router.get('/orders/:timeframe', apiController.getOrdersByTimeframe);
router.get('/net_profit_daily', apiController.getLastNDaysNetProfitController);
router.get('/order_count_by_province', apiController.getOrderCountByProvince);
router.get('/order_sales_by_province', apiController.getOrderSalesByProvince);
router.get('/top_skus_by_sales', apiController.getTopSkusBySales);
router.get('/last_n_days_spend_and_sales/:timeframe', apiController.getLastNDaysSpendAndSalesController);

module.exports = router;