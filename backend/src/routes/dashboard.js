const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getDashboard, getReports } = require('../controllers/dashboardController');

router.use(authMiddleware);

router.get('/', getDashboard);
router.get('/reports', getReports);

module.exports = router;