// Dashboard Stats Enhancement - Real-time statistics for Pogy Dashboard
const express = require('express');
const router = express.Router();
const Rank = require('../database/schemas/Rank');
const Economy = require('../database/schemas/Economy');

/**
 * Enhanced Dashboard Route with Statistics
 */
router.get('/dashboard/:guildId/stats', async (req, res) => {
  try {
    const client = req.app.locals.client;
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    // Check permissions
    const member = await guild.members.fetch(req.user.id);
    if (!member.permissions.has('MANAGE_GUILD')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Fetch statistics from database
    const [
      levelStats,
      economyStats
    ] = await Promise.all([
      // Level stats - top users
      Rank.find({ guildId: guild.id }).sort({ xp: -1 }).limit(10),
      
      // Economy stats
      Economy.find({ guildId: guild.id }).sort({ balance: -1 }).limit(10)
    ]);

    res.json({
      success: true,
      data: {
        levels: {
          topUsers: levelStats.map(user => ({
            userId: user.userId,
            username: user.username || 'Unknown',
            level: user.level,
            xp: user.xp
          })),
          totalUsers: levelStats.length
        },
        economy: {
          topUsers: economyStats.map(user => ({
            userId: user.userId,
            username: user.username || 'Unknown',
            balance: user.balance,
            bank: user.bank
          })),
          totalCoins: economyStats.reduce((acc, user) => acc + user.balance + user.bank, 0)
        },
        guildInfo: {
          memberCount: guild.memberCount,
          channelCount: guild.channels.cache.size,
          roleCount: guild.roles.cache.size,
          onlineCount: guild.members.cache.filter(m => m.presence?.status !== 'offline').size
        }
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
