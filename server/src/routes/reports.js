const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportsController');

router.get('/stock', ctrl.getStockSummary);
router.get('/low-stock', ctrl.getLowStockReport);
router.get('/out-of-stock', ctrl.getOutOfStockReport);
router.get('/sales', ctrl.getSalesReport);

module.exports = router;
