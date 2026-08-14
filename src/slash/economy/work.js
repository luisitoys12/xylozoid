const SlashCommand = require('../structures/SlashCommand');
const Economy = require('../../database/schemas/Economy');

class WorkCommand extends SlashCommand {
  constructor(client) {
    super(client, {
      name: 'work',
      description: 'Trabaja y gana monedas',
      category: 'Economy',
      cooldown: 3600000 // 1 hora
    });
  }

  async run(interaction) {
    const jobs = [
      { title: 'Desarrollador', min: 80, max: 150 },
      { title: 'Diseñador', min: 70, max: 130 },
      { title: 'Escritor', min: 50, max: 100 },
      { title: 'Camarero', min: 40, max: 80 },
      { title: 'Repartidor', min: 45, max: 90 },
      { title: 'Programador', min: 90, max: 180 },
      { title: 'Músico', min: 60, max: 120 },
      { title: 'Profesor', min: 75, max: 140 }
    ];

    const job = jobs[Math.floor(Math.random() * jobs.length)];
    const earnings = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;

    let economy = await Economy.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
    
    if (!economy) {
      economy = new Economy({
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        balance: earnings,
        lastWork: Date.now()
      });
      await economy.save();
    } else {
      economy.balance += earnings;
      economy.lastWork = Date.now();
      await economy.save();
    }

    const embed = {
      color: 0x00ff88,
      title: '💼 ¡Has trabajado!',
      description: `Trabajaste como **${job.title}** y ganaste **${earnings}** monedas.`,
      footer: { text: 'Vuelve a trabajar en 1 hora' }
    };

    await interaction.reply({ embeds: [embed] });
  }
}

module.exports = WorkCommand;
