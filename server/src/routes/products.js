const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/productsController');

router.get('/', ctrl.getProducts);
router.get('/:id/usage', ctrl.getProductUsage);
router.get('/:id', ctrl.getProductById);
router.post('/', ctrl.createProduct);
router.put('/:id/restore', ctrl.restoreProduct);
router.put('/:id', ctrl.updateProduct);
router.delete('/:id', ctrl.deleteProduct);

module.exports = router;
