const SlashCommand = require('../../structures/SlashCommand');
const { MessageEmbed } = require('discord.js');
const Economy = require('../../database/schemas/Economy');

module.exports = class DailySlashCommand extends SlashCommand {
  constructor(client) {
    super(client, {
      name: 'daily',
      description: 'Reclama tu recompensa diaria',
      category: 'Economía',
      cooldown: 10,
    });
  }

  build() {
    this.data; // No opciones necesarias
    return this.data;
  }

  async run(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const now = new Date();

    let economyData = await Economy.findOne({ userId, guildId });

    if (!economyData) {
      economyData = new Economy({ userId, guildId, balance: 0, bank: 0 });
    }

    // Verificar cooldown (24 horas)
    if (economyData.dailyCooldown) {
      const cooldownTime = 24 * 60 * 60 * 1000; // 24 horas en ms
      const timePassed = now - economyData.dailyCooldown;

      if (timePassed < cooldownTime) {
        const remaining = cooldownTime - timePassed;
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

        return interaction.editReply({
          embeds: [new MessageEmbed()
            .setDescription(`⏰ **Ya reclamaste tu daily!**\n\nVuelve en ${hours}h ${minutes}m.`)
            .setColor(this.client.color.red)]
        });
      }
    }

    // Recompensa diaria (100-500 coins aleatorios)
    const reward = Math.floor(Math.random() * 401) + 100;
    economyData.addBalance(reward);
    economyData.dailyCooldown = now;

    await economyData.save();

    const embed = new MessageEmbed()
      .setAuthor({ 
        name: `${interaction.user.tag} - Daily Claim`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true, size: 128 })
      })
      .setDescription(
        `🎁 **¡Recompensa Diaria Reclamada!**\n\n` +
        `Has recibido **$${reward.toLocaleString()}** coins.\n\n` +
        `💵 **Nuevo Balance:** $${economyData.balance.toLocaleString()}\n` +
        `🏦 **Banco:** $${economyData.bank.toLocaleString()}`
      )
      .setColor(this.client.color.green)
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
      .setFooter({ text: 'Vuelve mañana para otra recompensa!' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
