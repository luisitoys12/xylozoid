const express = require('express');
const router = express.Router();
const AutoMod = require('../../database/schemas/AutoMod');
const Warn = require('../../database/schemas/Warn');
const Ticket = require('../../database/schemas/Ticket');

// Middleware de autenticación (asumiendo que ya existe en tu dashboard)
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
};

// Ruta principal de configuración de AutoMod
router.get('/automod/:guildId', ensureAuthenticated, async (req, res) => {
  try {
    const guild = req.client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).send('Servidor no encontrado');

    // Verificar permisos
    const member = await guild.members.fetch(req.user.id);
    if (!member.permissions.has('ADMINISTRATOR')) {
      return res.status(403).send('No tienes permisos de administrador');
    }

    let automodConfig = await AutoMod.findOne({ guildId: guild.id });
    if (!automodConfig) {
      automodConfig = new AutoMod({ guildId: guild.id });
      await automodConfig.save();
    }

    res.render('automod-config', {
      user: req.user,
      guild,
      config: automodConfig
    });
  } catch (error) {
    console.error('Error loading AutoMod config:', error);
    res.status(500).send('Error al cargar configuración');
  }
});

// Actualizar configuración de AutoMod
router.post('/automod/:guildId/update', ensureAuthenticated, async (req, res) => {
  try {
    const guild = req.client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ success: false, message: 'Servidor no encontrado' });

    const member = await guild.members.fetch(req.user.id);
    if (!member.permissions.has('ADMINISTRATOR')) {
      return res.status(403).json({ success: false, message: 'Sin permisos' });
    }

    const {
      antiSpam,
      antiLinks,
      antiInvites,
      antiMassMention,
      prohibitedWords,
      punishment,
      ignoredRoles,
      ignoredChannels
    } = req.body;

    let config = await AutoMod.findOne({ guildId: guild.id });
    if (!config) {
      config = new AutoMod({ guildId: guild.id });
    }

    // Actualizar campos
    if (antiSpam !== undefined) config.antiSpam.enabled = antiSpam;
    if (antiLinks !== undefined) config.antiLinks.enabled = antiLinks;
    if (antiInvites !== undefined) config.antiInvites.enabled = antiInvites;
    if (antiMassMention !== undefined) config.antiMassMention.enabled = antiMassMention;
    if (prohibitedWords !== undefined) {
      config.prohibitedWords = prohibitedWords.split(',').map(w => w.trim()).filter(w => w);
    }
    if (punishment) config.punishment = punishment;
    if (ignoredRoles) config.ignoredRoles = ignoredRoles.split(',').map(r => r.trim());
    if (ignoredChannels) config.ignoredChannels = ignoredChannels.split(',').map(c => c.trim());

    await config.save();

    res.json({ success: true, message: 'Configuración actualizada correctamente' });
  } catch (error) {
    console.error('Error updating AutoMod:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar' });
  }
});

// Historial de warns
router.get('/warns/:guildId', ensureAuthenticated, async (req, res) => {
  try {
    const guild = req.client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).send('Servidor no encontrado');

    const member = await guild.members.fetch(req.user.id);
    if (!member.permissions.has('ADMINISTRATOR')) {
      return res.status(403).send('Sin permisos');
    }

    const warns = await Warn.find({ guildId: guild.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.render('warns-history', {
      user: req.user,
      guild,
      warns
    });
  } catch (error) {
    console.error('Error loading warns:', error);
    res.status(500).send('Error al cargar warns');
  }
});

// Sistema de tickets - Configuración
router.get('/tickets/:guildId', ensureAuthenticated, async (req, res) => {
  try {
    const guild = req.client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).send('Servidor no encontrado');

    const member = await guild.members.fetch(req.user.id);
    if (!member.permissions.has('ADMINISTRATOR')) {
      return res.status(403).send('Sin permisos');
    }

    const openTickets = await Ticket.countDocuments({ guildId: guild.id, status: 'open' });
    const closedTickets = await Ticket.countDocuments({ guildId: guild.id, status: 'closed' });

    res.render('tickets-config', {
      user: req.user,
      guild,
      stats: { openTickets, closedTickets }
    });
  } catch (error) {
    console.error('Error loading tickets config:', error);
    res.status(500).send('Error al cargar tickets');
  }
});

module.exports = router;
