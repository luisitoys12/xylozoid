const SlashCommand = require('../../structures/SlashCommand');
const { MessageEmbed } = require('discord.js');
const Guild = require('../../database/schemas/Guild');

module.exports = class BanSlashCommand extends SlashCommand {
  constructor(client) {
    super(client, {
      name: 'ban',
      description: 'Banea a un usuario del servidor',
      category: 'Moderación',
      userPermission: ['BAN_MEMBERS'],
      botPermission: ['BAN_MEMBERS'],
      cooldown: 5,
    });
  }

  // Construir la estructura del comando slash
  build() {
    this.data
      .addUserOption(option =>
        option.setName('usuario')
          .setDescription('El usuario a banear')
          .setRequired(true)
      )
      .addStringOption(option =>
        option.setName('razon')
          .setDescription('La razón del baneo')
          .setRequired(false)
      )
      .addIntegerOption(option =>
        option.setName('dias')
          .setDescription('Días de mensajes a eliminar (0-7)')
          .setMinValue(0)
          .setMaxValue(7)
          .setRequired(false)
      );
    
    return this.data;
  }

  async run(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const guildDB = await Guild.findOne({ guildId: interaction.guild.id });
    const language = require(`../../data/language/${guildDB.language || 'english'}.json`);

    const targetUser = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razon') || language.noReasonProvided || 'Sin razón proporcionada';
    const deleteDays = interaction.options.getInteger('dias') || 0;

    // Validaciones
    if (targetUser.id === interaction.user.id) {
      return interaction.editReply({
        embeds: [new MessageEmbed()
          .setDescription(`${this.client.emoji.fail} | No puedes baniarte a ti mismo`)
          .setColor(this.client.color.red)]
      });
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    
    if (member) {
      if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.editReply({
          embeds: [new MessageEmbed()
            .setDescription(`${this.client.emoji.fail} | No puedes banear a alguien con un rol igual o superior al tuyo`)
            .setColor(this.client.color.red)]
        });
      }

      if (!member.bannable) {
        return interaction.editReply({
          embeds: [new MessageEmbed()
            .setDescription(`${this.client.emoji.fail} | Este usuario no puede ser baneado`)
            .setColor(this.client.color.red)]
        });
      }
    }

    try {
      // Intentar enviar DM al usuario
      if (member) {
        await targetUser.send({
          embeds: [new MessageEmbed()
            .setDescription(`Has sido baneado de **${interaction.guild.name}**\n\n**Razón:** ${reason}\n**Moderador:** ${interaction.user.tag}`)
            .setColor(this.client.color.red)]
        }).catch(() => {});
      }

      // Ejecutar el baneo
      await interaction.guild.members.ban(targetUser.id, {
        deleteMessageSeconds: deleteDays * 24 * 60 * 60,
        reason: `${reason} | Moderador: ${interaction.user.tag}`
      });

      const embed = new MessageEmbed()
        .setDescription(`${this.client.emoji.success} | **${targetUser.tag}** ha sido baneado del servidor.\n\n**Razón:** ${reason}`)
        .setColor(this.client.color.green)
        .setFooter({ text: `ID: ${targetUser.id}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error al banear:', error);
      return interaction.editReply({
        embeds: [new MessageEmbed()
          .setDescription(`${this.client.emoji.fail} | Error al banear al usuario: ${error.message}`)
          .setColor(this.client.color.red)]
      });
    }
  }
};
