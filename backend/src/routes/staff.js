const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getStaff, createStaff, updateStaff, deleteStaff, staffLogin } = require('../controllers/staffController');

// Staff routes for shop owners
router.post('/login', authMiddleware, staffLogin);

router.use(authMiddleware);

router.get('/', getStaff);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);

module.exports = router;
