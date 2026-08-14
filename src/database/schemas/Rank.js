const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  messages: { type: Number, default: 0 },
  voiceMinutes: { type: Number, default: 0 },
  lastMessageAt: { type: Date, default: null },
  lastVoiceAt: { type: Date, default: null },
  cooldown: { type: Boolean, default: false },
});

// Método para calcular el XP necesario para el siguiente nivel
schema.methods.xpForNextLevel = function() {
  return Math.floor(100 * Math.pow(1.5, this.level - 1));
};

// Método para subir de nivel si corresponde
schema.methods.addXP = function(amount) {
  this.xp += amount;
  this.messages += 1;
  
  const xpNeeded = this.xpForNextLevel();
  
  if (this.xp >= xpNeeded) {
    this.level += 1;
    this.xp = this.xp - xpNeeded;
    return true; // Level up!
  }
  
  return false;
};

schema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('Rank', schema);
