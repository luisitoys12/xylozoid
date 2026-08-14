const SlashCommand = require('../../structures/SlashCommand');
const { MessageEmbed } = require('discord.js');
const Rank = require('../../database/schemas/Rank');

module.exports = class RankSlashCommand extends SlashCommand {
  constructor(client) {
    super(client, {
      name: 'rank',
      description: 'Muestra tu nivel y XP o la de otro usuario',
      category: 'Niveles',
      cooldown: 5,
    });
  }

  build() {
    this.data
      .addUserOption(option =>
        option.setName('usuario')
          .setDescription('El usuario cuyo rank quieres ver')
          .setRequired(false)
      );
    
    return this.data;
  }

  async run(interaction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    const guildId = interaction.guild.id;
    const userId = targetUser.id;

    let rankData = await Rank.findOne({ userId, guildId });

    // Si no existe, crearlo
    if (!rankData) {
      rankData = new Rank({ userId, guildId, xp: 0, level: 1, messages: 0 });
      await rankData.save();
    }

    const xpNeeded = rankData.xpForNextLevel();
    const progress = (rankData.xp / xpNeeded) * 100;

    // Obtener posición en el leaderboard
    const leaderboard = await Rank.find({ guildId }).sort({ level: -1, xp: -1 });
    const position = leaderboard.findIndex(u => u.userId === userId) + 1;

    const embed = new MessageEmbed()
      .setAuthor({ 
        name: `${targetUser.tag} - Nivel ${rankData.level}`,
        iconURL: targetUser.displayAvatarURL({ dynamic: true, size: 128 })
      })
      .setDescription(
        `**XP:** ${rankData.xp} / ${xpNeeded}\n` +
        `**Progreso:** [${'█'.repeat(Math.floor(progress / 10))}${'░'.repeat(10 - Math.floor(progress / 10))}] ${Math.floor(progress)}%\n` +
        `**Mensajes:** ${rankData.messages}\n` +
        `**Posición:** #${position}`
      )
      .setColor(this.client.color.blue)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .setFooter({ text: 'Sigue enviando mensajes para subir de nivel!' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
