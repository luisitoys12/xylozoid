const SlashCommand = require('../../structures/SlashCommand');
const { MessageEmbed } = require('discord.js');
const Economy = require('../../database/schemas/Economy');

module.exports = class BalanceSlashCommand extends SlashCommand {
  constructor(client) {
    super(client, {
      name: 'balance',
      description: 'Muestra tu balance o el de otro usuario',
      category: 'Economía',
      cooldown: 5,
    });
  }

  build() {
    this.data
      .addUserOption(option =>
        option.setName('usuario')
          .setDescription('El usuario cuyo balance quieres ver')
          .setRequired(false)
      );
    
    return this.data;
  }

  async run(interaction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    const guildId = interaction.guild.id;
    const userId = targetUser.id;

    let economyData = await Economy.findOne({ userId, guildId });

    // Si no existe, crearlo
    if (!economyData) {
      economyData = new Economy({ userId, guildId, balance: 0, bank: 0 });
      await economyData.save();
    }

    const embed = new MessageEmbed()
      .setAuthor({ 
        name: `${targetUser.tag} - Balance`,
        iconURL: targetUser.displayAvatarURL({ dynamic: true, size: 128 })
      })
      .setDescription(
        `💵 **Efectivo:** $${economyData.balance.toLocaleString()}\n` +
        `🏦 **Banco:** $${economyData.bank.toLocaleString()}\n` +
        `💰 **Total:** $${(economyData.balance + economyData.bank).toLocaleString()}\n\n` +
        `📊 **Total Ganado:** $${economyData.totalEarned.toLocaleString()}\n` +
        `🛒 **Total Gastado:** $${economyData.totalSpent.toLocaleString()}`
      )
      .setColor(this.client.color.green)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .setFooter({ text: 'Usa /daily para reclamar tu recompensa diaria!' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
