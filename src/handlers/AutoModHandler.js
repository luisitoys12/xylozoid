const { MessageEmbed } = require('discord.js');

module.exports = class AutoModHandler {
  constructor(client) {
    this.client = client;
    this.messageCache = new Map(); // Para anti-spam
    this.raidCache = new Map(); // Para anti-raid
  }

  /**
   * Maneja el evento de mensaje para auto-moderación
   * @param {Message} message 
   */
  async handleMessage(message) {
    if (!message.guild || message.author.bot) return;
    
    const AutoMod = require('../database/schemas/AutoMod');
    const automodData = await AutoMod.findOne({ guildId: message.guild.id });
    
    if (!automodData || automodData.automod.toggle !== 'true') return;

    const member = message.member;
    
    // Verificar canales y roles ignorados
    const ignoredChannels = [
      ...(automodData.automod.antiSpam.ignoreChannels || []),
      ...(automodData.automod.antiLinks.allowedChannels || []),
      ...(automodData.automod.antiInvites.allowedChannels || [])
    ];
    
    if (ignoredChannels.includes(message.channel.id)) return;

    const ignoredRoles = [
      ...(automodData.automod.antiSpam.ignoreRoles || []),
      ...(automodData.automod.antiLinks.allowedRoles || []),
      ...(automodData.automod.antiInvites.allowedRoles || [])
    ];
    
    if (member.roles.cache.some(role => ignoredRoles.includes(role.id))) return;

    // Anti-Spam
    if (automodData.automod.antiSpam.toggle === 'true') {
      await this.checkSpam(message, automodData);
    }

    // Anti-Links
    if (automodData.automod.antiLinks.toggle === 'true') {
      await this.checkLinks(message, automodData);
    }

    // Anti-Invites
    if (automodData.automod.antiInvites.toggle === 'true') {
      await this.checkInvites(message, automodData);
    }

    // Anti-Mass Mention
    if (automodData.automod.antiMassMention.toggle === 'true') {
      await this.checkMassMention(message, automodData);
    }

    // Word Filter
    if (automodData.automod.wordFilter.toggle === 'true') {
      await this.checkWordFilter(message, automodData);
    }
  }

  /**
   * Verifica spam de mensajes
   */
  async checkSpam(message, automodData) {
    const { threshold, timeframe, punishment } = automodData.automod.antiSpam;
    const now = Date.now();
    const userId = message.author.id;

    if (!this.messageCache.has(userId)) {
      this.messageCache.set(userId, []);
    }

    const userMessages = this.messageCache.get(userId);
    userMessages.push(now);

    // Eliminar mensajes fuera del timeframe
    while (userMessages[0] && userMessages[0] < now - (timeframe * 1000)) {
      userMessages.shift();
    }

    // Verificar si excede el threshold
    if (userMessages.length > threshold) {
      await this.applyPunishment(message, punishment, 'spam');
      
      // Limpiar caché
      this.messageCache.delete(userId);
    }
  }

  /**
   * Verifica links no permitidos
   */
  async checkLinks(message, automodData) {
    const content = message.content;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex);

    if (!urls) return;

    const whitelist = automodData.automod.antiLinks.whitelist || [];
    
    for (const url of urls) {
      const isWhitelisted = whitelist.some(wl => url.includes(wl));
      
      if (!isWhitelisted) {
        await message.delete().catch(() => {});
        await this.applyPunishment(message, automodData.automod.antiLinks.punishment, 'links');
        break;
      }
    }
  }

  /**
   * Verifica invites de Discord
   */
  async checkInvites(message, automodData) {
    const content = message.content;
    const inviteRegex = /discord(?:app\.com\/invite|\.gg(?:\/invite)?)\/([a-zA-Z0-9]+)/g;
    const invites = content.match(inviteRegex);

    if (!invites) return;

    const whitelist = automodData.automod.antiInvites.whitelist || [];
    
    for (const invite of invites) {
      const code = invite.split('/').pop();
      const isWhitelisted = whitelist.some(wl => code === wl);
      
      if (!isWhitelisted) {
        await message.delete().catch(() => {});
        await this.applyPunishment(message, automodData.automod.antiInvites.punishment, 'invite');
        break;
      }
    }
  }

  /**
   * Verifica menciones masivas
   */
  async checkMassMention(message, automodData) {
    const mentions = message.mentions.users.size;
    const threshold = automodData.automod.antiMassMention.threshold;

    if (mentions >= threshold) {
      await message.delete().catch(() => {});
      await this.applyPunishment(message, automodData.automod.antiMassMention.punishment, 'massmention');
    }
  }

  /**
   * Verifica filtro de palabras
   */
  async checkWordFilter(message, automodData) {
    const words = automodData.automod.wordFilter.words || [];
    const content = message.content.toLowerCase();

    for (const word of words) {
      if (content.includes(word.toLowerCase())) {
        await message.delete().catch(() => {});
        await this.applyPunishment(message, automodData.automod.wordFilter.punishment, 'badword');
        break;
      }
    }
  }

  /**
   * Aplica castigo según configuración
   */
  async applyPunishment(message, punishment, type) {
    const logChannel = await this.getLogChannel(message.guild);
    
    // Crear embed de registro
    const embed = new MessageEmbed()
      .setAuthor({ name: `AutoMod - ${type}`, iconURL: this.client.user.displayAvatarURL() })
      .addField('Usuario', `${message.author} (${message.author.tag})`, true)
      .addField('Canal', message.channel, true)
      .addField('Acción', punishment, true)
      .addField('Mensaje', message.content.substring(0, 500) || 'N/A', false)
      .setTimestamp()
      .setColor(this.client.color.red);

    switch (punishment) {
      case 'warn':
        await this.warnUser(message.member, `AutoMod: ${type}`);
        break;
      case 'mute':
        await this.muteUser(message.member, message.guild);
        break;
      case 'kick':
        await message.member.kick(`AutoMod: ${type}`).catch(() => {});
        break;
      case 'ban':
        await message.member.ban({ reason: `AutoMod: ${type}` }).catch(() => {});
        break;
    }

    // Log
    if (logChannel) {
      await logChannel.send({ embeds: [embed] }).catch(() => {});
    }
  }

  async warnUser(member, reason) {
    // Implementar sistema de warns
    console.log(`${member.user.tag} fue advertido: ${reason}`);
  }

  async muteUser(member, guild) {
    // Buscar rol de muted o crear uno por defecto
    let muteRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');
    
    if (!muteRole) {
      // Crear rol muted si no existe
      muteRole = await guild.roles.create({
        name: 'Muted',
        permissions: [],
        reason: 'AutoMod: Rol de muted'
      }).catch(() => null);
    }
    
    if (muteRole) {
      await member.roles.add(muteRole).catch(() => {});
    }
  }

  async getLogChannel(guild) {
    const AutoMod = require('../database/schemas/AutoMod');
    const data = await AutoMod.findOne({ guildId: guild.id });
    
    if (data && data.automod.logChannel) {
      return guild.channels.cache.get(data.automod.logChannel);
    }
    
    return null;
  }
};
