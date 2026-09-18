const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/billingController');

router.get('/', ctrl.getBills);
router.get('/:id', ctrl.getBillById);
router.post('/', ctrl.createBill);

module.exports = router;
