const express = require('express');
const router = express.Router();
const { authMiddleware, checkRole } = require('../middleware/auth');
const { getStaff, createStaff, updateStaff, deleteStaff, staffLogin } = require('../controllers/staffController');

// Staff routes for shop owners
router.use(authMiddleware);

router.get('/', getStaff);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);

// Staff login
router.post('/login', staffLogin);

module.exports = router;