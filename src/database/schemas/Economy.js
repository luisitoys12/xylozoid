const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  balance: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  dailyCooldown: { type: Date, default: null },
  weeklyCooldown: { type: Date, default: null },
  workCooldown: { type: Date, default: null },
  lastWork: { type: String, default: null },
  inventory: [{ 
    item: String,
    quantity: Number,
    metadata: Object
  }],
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
});

// Métodos de economía
schema.methods.addBalance = function(amount) {
  this.balance += amount;
  this.totalEarned += amount;
};

schema.methods.removeBalance = function(amount) {
  if (this.balance >= amount) {
    this.balance -= amount;
    this.totalSpent += amount;
    return true;
  }
  return false;
};

schema.methods.deposit = function(amount) {
  if (this.balance >= amount) {
    this.balance -= amount;
    this.bank += amount;
    return true;
  }
  return false;
};

schema.methods.withdraw = function(amount) {
  if (this.bank >= amount) {
    this.bank -= amount;
    this.balance += amount;
    return true;
  }
  return false;
};

schema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('Economy', schema);
