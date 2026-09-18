const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/stockController');

router.post('/in', ctrl.stockIn);
router.post('/out', ctrl.stockOut);
router.get('/history', ctrl.getStockHistory);

module.exports = router;
