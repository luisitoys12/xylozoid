const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  guildId: { type: String, required: true },
  
  // Auto-moderación
  automod: {
    toggle: { type: String, default: 'false' },
    
    // Anti-spam
    antiSpam: {
      toggle: { type: String, default: 'false' },
      threshold: { type: Number, default: 5 }, // mensajes en
      timeframe: { type: Number, default: 5 }, // segundos
      punishment: { type: String, default: 'warn' }, // warn, mute, kick, ban
      ignoreRoles: [String],
      ignoreChannels: [String]
    },
    
    // Anti-raid
    antiRaid: {
      toggle: { type: String, default: 'false' },
      threshold: { type: Number, default: 10 }, // usuarios en
      timeframe: { type: Number, default: 30 }, // segundos
      action: { type: String, default: 'kick' }
    },
    
    // Anti-links
    antiLinks: {
      toggle: { type: String, default: 'false' },
      allowedRoles: [String],
      allowedChannels: [String],
      whitelist: [String],
      punishment: { type: String, default: 'warn' }
    },
    
    // Anti-invites
    antiInvites: {
      toggle: { type: String, default: 'false' },
      allowedRoles: [String],
      allowedChannels: [String],
      whitelist: [String], // IDs de servidores permitidos
      punishment: { type: String, default: 'warn' }
    },
    
    // Anti-menciones masivas
    antiMassMention: {
      toggle: { type: String, default: 'false' },
      threshold: { type: Number, default: 5 }, // menciones máximas
      punishment: { type: String, default: 'warn' }
    },
    
    // Filtro de palabras
    wordFilter: {
      toggle: { type: String, default: 'false' },
      words: [String],
      punishment: { type: String, default: 'warn' }
    },
    
    // Anti-ghost ping
    antiGhostPing: {
      toggle: { type: String, default: 'false' },
      logOnly: { type: String, default: 'true' }
    },
    
    // Canal de registro
    logChannel: { type: String, default: null },
    
    // Rol de muted
    muteRole: { type: String, default: null }
  }
});

schema.index({ guildId: 1 }, { unique: true });

module.exports = mongoose.model('AutoMod', schema);
