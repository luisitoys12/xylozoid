const SlashCommand = require('../structures/SlashCommand');
const Economy = require('../../database/schemas/Economy');

class GambleCommand extends SlashCommand {
  constructor(client) {
    super(client, {
      name: 'gamble',
      description: 'Apuesta monedas al azar',
      category: 'Economy',
      options: [
        {
          name: 'cantidad',
          type: 4, // INTEGER
          description: 'Cantidad de monedas a apostar',
          required: true,
          min_value: 1
        }
      ],
      cooldown: 30000 // 30 segundos
    });
  }

  async run(interaction) {
    const amount = interaction.options.getInteger('cantidad');
    
    let economy = await Economy.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
    
    if (!economy || economy.balance < amount) {
      return interaction.reply({ 
        content: `❌ No tienes suficientes monedas. Tu balance: ${economy ? economy.balance : 0}`, 
        ephemeral: true 
      });
    }

    // 50% de probabilidad de ganar o perder
    const won = Math.random() > 0.5;
    const result = won ? amount : -amount;
    
    economy.balance += result;
    await economy.save();

    const embed = {
      color: won ? 0x00ff88 : 0xff4444,
      title: won ? '🎉 ¡Ganaste!' : '💸 ¡Perdiste!',
      description: won 
        ? `¡Tu apuesta de **${amount}** coins se duplicó! Ganaste **${amount}** coins.`
        : `Perdiste tu apuesta de **${amount}** coins.`,
      fields: [
        { name: 'Resultado', value: won ? '+${amount}' : `-${amount}`, inline: true },
        { name: 'Nuevo Balance', value: `${economy.balance} coins`, inline: true }
      ],
      footer: { text: won ? '¡Buena suerte la próxima vez!' : '¡No te rindas!' }
    };

    await interaction.reply({ embeds: [embed] });
  }
}

module.exports = GambleCommand;
