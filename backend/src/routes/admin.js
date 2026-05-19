const express = require('express');
const router = express.Router();
const { authMiddleware, checkRole } = require('../middleware/auth');
const {
  getAllShops, createShop, updateShop, deleteShop,
  getPlans, createPlan, getDashboard, getAuditLogs
} = require('../controllers/adminController');

router.use(authMiddleware);
router.use(checkRole(['super_admin']));

router.get('/shops', getAllShops);
router.post('/shops', createShop);
router.put('/shops/:id', updateShop);
router.delete('/shops/:id', deleteShop);

router.get('/plans', getPlans);
router.post('/plans', createPlan);

router.get('/dashboard', getDashboard);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
