const db = require('../config/db');

const logAudit = ({
  shop_id = null,
  actor_id = null,
  actor_role = null,
  action,
  entity_type,
  entity_id = null,
  details = null,
}) => {
  if (!action || !entity_type) return;

  db.run(
    `INSERT INTO audit_logs (shop_id, actor_id, actor_role, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      shop_id,
      actor_id,
      actor_role,
      action,
      entity_type,
      entity_id,
      details ? JSON.stringify(details) : null,
    ],
    () => {}
  );
};

module.exports = { logAudit };

