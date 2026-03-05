const express = require('express');
const router = express.Router();
const {
  createOrder,
  cancelOrder,
  adminApproveOrder,
  supplierApproveOrder,
  shipOrder,
  deliverOrder,
  getMyOrders,
  getAllOrders,
  customerConfirmDelivery
} = require('../controllers/orderController');

const verifyToken = require('../middleware/verifyToken');

// ── Role middlewares ──────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ message: 'أدمن فقط' });
  next();
};

const supplierOnly = (req, res, next) => {
  if (req.user?.role !== 'supplier')
    return res.status(403).json({ message: 'موردين فقط' });
  next();
};

// ── Customer routes ───────────────────────────────────
router.get('/my', verifyToken, getMyOrders);
router.post('/', verifyToken, createOrder);
router.put('/cancel/:orderId', verifyToken, cancelOrder);
router.put('/customer-confirm/:orderId', verifyToken, customerConfirmDelivery);

// ── Admin-only routes 🔒 ──────────────────────────────
router.get('/', verifyToken, adminOnly, getAllOrders);
router.get('/all', verifyToken, adminOnly, getAllOrders);
router.put('/admin-approve/:orderId', verifyToken, adminOnly, adminApproveOrder);
router.put('/ship/:orderId', verifyToken, adminOnly, shipOrder);
router.put('/deliver/:orderId', verifyToken, adminOnly, deliverOrder);

// ── Supplier-only routes 🔒 ───────────────────────────
router.put('/supplier-approve/:orderId', verifyToken, supplierOnly, supplierApproveOrder);

module.exports = router;
