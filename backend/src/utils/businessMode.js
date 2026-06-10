const BUSINESS_MODES = {
  WATER_19L: 'water_19l',
  PET_TRADING: 'pet_trading',
};

const normalizeBusinessMode = (value) => {
  const mode = String(value || '').trim().toLowerCase();
  if (mode === BUSINESS_MODES.PET_TRADING) return BUSINESS_MODES.PET_TRADING;
  return BUSINESS_MODES.WATER_19L;
};

const isPetTradingMode = (shopOrUser) =>
  normalizeBusinessMode(shopOrUser?.business_mode) === BUSINESS_MODES.PET_TRADING;

const isRestrictedPetCashier = (user, shop) =>
  Boolean(
    user?.type === 'staff' &&
    user?.role === 'cashier' &&
    isPetTradingMode(shop || user)
  );

module.exports = {
  BUSINESS_MODES,
  normalizeBusinessMode,
  isPetTradingMode,
  isRestrictedPetCashier,
};
