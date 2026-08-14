const SlashCommand = require('../../structures/SlashCommand');
const { MessageEmbed } = require('discord.js');
const Rank = require('../../database/schemas/Rank');

module.exports = class LeaderboardSlashCommand extends SlashCommand {
  constructor(client) {
    super(client, {
      name: 'leaderboard',
      description: 'Muestra el top de usuarios por nivel o XP',
      category: 'Niveles',
      cooldown: 10,
    });
  }

  build() {
    this.data
      .addStringOption(option =>
        option.setName('tipo')
          .setDescription('Tipo de leaderboard')
          .addChoices(
            { name: 'Nivel', value: 'level' },
            { name: 'XP', value: 'xp' },
            { name: 'Mensajes', value: 'messages' }
          )
          .setRequired(false)
      );
    
    return this.data;
  }

  async run(interaction) {
    await interaction.deferReply();

    const type = interaction.options.getString('tipo') || 'level';
    const guildId = interaction.guild.id;

    // Determinar el campo a ordenar
    let sortField = type;
    if (!['level', 'xp', 'messages'].includes(type)) {
      sortField = 'level';
    }

    // Obtener top 10 usuarios
    const leaderboard = await Rank.find({ guildId })
      .sort({ [sortField]: -1 })
      .limit(10);

    if (leaderboard.length === 0) {
      return interaction.editReply({
        embeds: [new MessageEmbed()
          .setDescription('❌ No hay datos en el leaderboard aún.')
          .setColor(this.client.color.red)]
      });
    }

    // Construir la lista
    let description = '';
    for (let i = 0; i < leaderboard.length; i++) {
      const user = leaderboard[i];
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      
      try {
        const member = await interaction.guild.members.fetch(user.userId);
        description += `${medal} **${member.user.tag}** - Nivel ${user.level} | ${user.xp} XP\n`;
      } catch {
        description += `${medal} **Usuario Desconocido** - Nivel ${user.level} | ${user.xp} XP\n`;
      }
    }

    const embed = new MessageEmbed()
      .setAuthor({ 
        name: `🏆 Leaderboard - ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        iconURL: interaction.guild.iconURL({ dynamic: true })
      })
      .setDescription(description)
      .setColor(this.client.color.gold || '#FFD700')
      .setFooter({ text: 'Sigue enviando mensajes para subir en el ranking!' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
