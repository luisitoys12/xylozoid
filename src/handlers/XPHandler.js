const { MessageEmbed } = require('discord.js');

module.exports = class XPHandler {
  constructor(client) {
    this.client = client;
    this.xpCooldowns = new Map();
    this.XP_PER_MESSAGE = 15; // XP base por mensaje
    this.XP_MULTIPLIER_ROLE = 1.5; // Multiplicador para roles premium
  }

  /**
   * Maneja el evento de mensaje para ganar XP
   * @param {Message} message 
   */
  async handleMessage(message) {
    if (!message.guild || message.author.bot) return;
    
    // Verificar cooldown (1 minuto entre mensajes que dan XP)
    const userId = message.author.id;
    const guildId = message.guild.id;
    const key = `${userId}-${guildId}`;
    
    if (this.xpCooldowns.has(key)) {
      return;
    }

    const Rank = require('../database/schemas/Rank');
    
    let rankData = await Rank.findOne({ userId, guildId });
    
    // Crear si no existe
    if (!rankData) {
      rankData = new Rank({ userId, guildId, xp: 0, level: 1, messages: 0 });
    }

    // Calcular XP con posibles multiplicadores
    let xpAmount = this.XP_PER_MESSAGE;
    
    // Verificar si tiene rol premium (configurable)
    const premiumRoleId = process.env.PREMIUM_ROLE_ID;
    if (premiumRoleId && message.member.roles.cache.has(premiumRoleId)) {
      xpAmount = Math.floor(xpAmount * this.XP_MULTIPLIER_ROLE);
    }

    // Añadir XP
    const leveledUp = rankData.addXP(xpAmount);
    
    // Guardar
    rankData.lastMessageAt = new Date();
    await rankData.save();

    // Notificar level up
    if (leveledUp) {
      await this.notifyLevelUp(message, rankData);
    }

    // Establecer cooldown (60 segundos)
    this.xpCooldowns.set(key, true);
    setTimeout(() => {
      this.xpCooldowns.delete(key);
    }, 60000);
  }

  /**
   * Notifica al usuario cuando sube de nivel
   */
  async notifyLevelUp(message, rankData) {
    const Guild = require('../database/schemas/Guild');
    const guildDB = await Guild.findOne({ guildId: message.guild.id });
    
    // Verificar si está habilitado el mensaje de level up
    const enableLevelUp = guildDB?.plugins?.levelup?.enabled !== 'false';
    
    if (!enableLevelUp) return;

    const user = message.author;
    const newLevel = rankData.level;

    const embed = new MessageEmbed()
      .setAuthor({ 
        name: `🎉 ${user.tag} subió al nivel ${newLevel}!`,
        iconURL: user.displayAvatarURL({ dynamic: true })
      })
      .setDescription(
        `Has alcanzado el **nivel ${newLevel}**!\n\n` +
        `Continúa participando para seguir subiendo!`
      )
      .setColor(this.client.color.gold || '#FFD700')
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setFooter({ text: `Nivel ${newLevel - 1} → ${newLevel}` })
      .setTimestamp();

    // Enviar en el mismo canal o en canal configurado
    const levelUpChannel = guildDB?.plugins?.levelup?.channel;
    let channel = message.channel;
    
    if (levelUpChannel) {
      channel = message.guild.channels.cache.get(levelUpChannel) || message.channel;
    }

    await channel.send({ 
      content: `${user}`,
      embeds: [embed]
    }).catch(() => {});
  }

  /**
   * Evento de voz - gana XP por tiempo en canal de voz
   */
  async handleVoiceStateUpdate(oldState, newState) {
    // Usuario se une a canal de voz
    if (!oldState.channel && newState.channel) {
      const Rank = require('../database/schemas/Rank');
      
      let rankData = await Rank.findOne({ 
        userId: newState.member.id, 
        guildId: newState.guild.id 
      });
      
      if (!rankData) {
        rankData = new Rank({ 
          userId: newState.member.id, 
          guildId: newState.guild.id,
          xp: 0, 
          level: 1, 
          voiceMinutes: 0 
        });
      }
      
      rankData.lastVoiceAt = new Date();
      await rankData.save();
    }
    
    // Usuario sale de canal de voz - calcular XP
    if (oldState.channel && !newState.channel) {
      if (oldState.member.user.bot) return;
      
      const Rank = require('../database/schemas/Rank');
      
      let rankData = await Rank.findOne({ 
        userId: oldState.member.id, 
        guildId: oldState.guild.id 
      });
      
      if (!rankData || !rankData.lastVoiceAt) return;
      
      const now = new Date();
      const minutesInVoice = Math.floor((now - rankData.lastVoiceAt) / 60000);
      
      if (minutesInVoice >= 5) { // Mínimo 5 minutos
        const xpGained = minutesInVoice * 2; // 2 XP por minuto
        const leveledUp = rankData.addXP(xpGained);
        
        rankData.voiceMinutes += minutesInVoice;
        rankData.lastVoiceAt = null;
        await rankData.save();
        
        if (leveledUp) {
          // Crear mensaje fake para notificar
          const fakeMessage = {
            guild: oldState.guild,
            author: oldState.member.user,
            member: oldState.member
          };
          await this.notifyLevelUp(fakeMessage, rankData);
        }
      }
    }
  }
};
