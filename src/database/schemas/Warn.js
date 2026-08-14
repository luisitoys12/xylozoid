const mongoose = require('mongoose');

const warnSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  moderatorId: { type: String, required: true },
  reason: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null }, // Para warns temporales
  active: { type: Boolean, default: true }
});

module.exports = mongoose.model('Warn', warnSchema);
