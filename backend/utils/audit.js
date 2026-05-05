const AuditLog = require('../models/AuditLog');

async function logAudit({ req, action, category = 'system', details = '', meta = {} }) {
  try {
    const actor     = req?.user?._id || null;
    const actorName = req?.user?.name || 'System';
    const actorRole = req?.user?.role || '';
    const houseCode = req?.user?.houseCode || meta?.houseCode || '';
    const ip        = req?.ip || req?.headers?.['x-forwarded-for'] || '';
    await AuditLog.create({ actor, actorName, actorRole, houseCode, action, category, details, meta, ip });
  } catch {}
}

module.exports = { logAudit };
