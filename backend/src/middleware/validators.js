const { body, param } = require('express-validator');

const isIsoDate = /^\d{4}-\d{2}-\d{2}$/;

const customerCreateRules = [
  body('name').isString().trim().notEmpty().withMessage('Name is required'),
  body('phone').optional({ nullable: true }).isString().trim().isLength({ min: 5 }).withMessage('Phone must be valid'),
  body('rate_per_bottle').isFloat({ gt: 0 }).withMessage('Rate per bottle must be greater than 0'),
  body('payment_type').optional().isIn(['cash', 'credit']).withMessage('Payment type must be cash or credit'),
  body('deposit_bottles').optional().isInt({ min: 0 }).withMessage('Deposit bottles must be >= 0'),
  body('security_deposit_amount').optional().isFloat({ min: 0 }).withMessage('Security deposit amount must be >= 0'),
];

const customerUpdateRules = [
  param('id').isInt({ min: 1 }).withMessage('Customer id is invalid'),
  body('name').isString().trim().notEmpty().withMessage('Name is required'),
  body('phone').optional({ nullable: true }).isString().trim().isLength({ min: 5 }).withMessage('Phone must be valid'),
  body('rate_per_bottle').isFloat({ gt: 0 }).withMessage('Rate per bottle must be greater than 0'),
  body('payment_type').optional().isIn(['cash', 'credit']).withMessage('Payment type must be cash or credit'),
  body('deposit_bottles').optional().isInt({ min: 0 }).withMessage('Deposit bottles must be >= 0'),
  body('security_deposit_amount').optional().isFloat({ min: 0 }).withMessage('Security deposit amount must be >= 0'),
];

const customerDeleteRules = [
  param('id').isInt({ min: 1 }).withMessage('Customer id is invalid'),
];

const paymentCreateRules = [
  body('customer_id').isInt({ min: 1 }).withMessage('Customer is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('payment_date').custom((v) => isIsoDate.test(String(v || ''))).withMessage('Payment date must be YYYY-MM-DD'),
  body('payment_type').optional().isIn(['partial', 'full', 'advance']).withMessage('Payment type is invalid'),
];

const deliveryCreateRules = [
  body('delivery_date').custom((v) => isIsoDate.test(String(v || ''))).withMessage('Delivery date must be YYYY-MM-DD'),
  body('bottles_delivered').isInt({ gt: 0 }).withMessage('Bottles delivered must be > 0'),
  body('bottles_returned').optional().isInt({ min: 0 }).withMessage('Bottles returned must be >= 0'),
  body('delivery_type').optional().isIn(['home_delivery', 'walk_in']).withMessage('Delivery type is invalid'),
  body('walkin_rate_per_bottle')
    .optional({ nullable: true })
    .isFloat({ gt: 0 })
    .withMessage('Walk-in rate per bottle must be greater than 0'),
];

const deliveryDeleteRules = [
  param('id').isInt({ min: 1 }).withMessage('Delivery id is invalid'),
];

module.exports = {
  customerCreateRules,
  customerUpdateRules,
  customerDeleteRules,
  paymentCreateRules,
  deliveryCreateRules,
  deliveryDeleteRules,
};
