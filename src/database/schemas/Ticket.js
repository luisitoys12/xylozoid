const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  userId: { type: String, required: true },
  ticketNumber: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['open', 'closed', 'archived'], 
    default: 'open' 
  },
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null },
  closedBy: { type: String, default: null },
  messages: [{
    userId: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('Ticket', ticketSchema);
