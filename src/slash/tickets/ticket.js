const SlashCommand = require('../structures/SlashCommand');
const Ticket = require('../../database/schemas/Ticket');

class TicketCommand extends SlashCommand {
  constructor(client) {
    super(client, {
      name: 'ticket',
      description: 'Sistema de tickets de soporte',
      category: 'Tickets',
      options: [
        {
          name: 'acción',
          type: 3, // STRING
          description: 'Acción a realizar',
          required: true,
          choices: [
            { name: '🎫 Crear ticket', value: 'create' },
            { name: '🔒 Cerrar ticket', value: 'close' },
            { name: '📋 Ver mis tickets', value: 'list' }
          ]
        }
      ]
    });
  }

  async run(interaction) {
    const action = interaction.options.getString('acción');

    if (action === 'create') {
      return this.createTicket(interaction);
    } else if (action === 'close') {
      return this.closeTicket(interaction);
    } else if (action === 'list') {
      return this.listTickets(interaction);
    }
  }

  async createTicket(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    // Verificar si ya tiene un ticket abierto
    const existingTicket = await Ticket.findOne({
      guildId,
      userId,
      status: 'open'
    });

    if (existingTicket) {
      return interaction.reply({
        content: `❌ Ya tienes un ticket abierto: <#${existingTicket.channelId}>`,
        ephemeral: true
      });
    }

    // Contar tickets totales para el número
    const totalTickets = await Ticket.countDocuments({ guildId });
    const ticketNumber = totalTickets + 1;

    // Crear canal de ticket
    const channelName = `ticket-${ticketNumber.toString().padStart(4, '0')}`;
    const channel = await interaction.guild.channels.create({
      name: channelName,
      topic: `Ticket #${ticketNumber} - ${interaction.user.tag}`,
      parent: this.findOrCreateTicketCategory(interaction.guild),
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: ['ViewChannel']
        },
        {
          id: userId,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
        },
        {
          id: interaction.client.user.id,
          allow: ['ViewChannel', 'SendMessages', 'ManageChannels']
        }
      ]
    });

    // Guardar en base de datos
    const ticket = new Ticket({
      guildId,
      channelId: channel.id,
      userId,
      ticketNumber,
      status: 'open'
    });
    await ticket.save();

    // Mensaje inicial
    const embed = {
      color: 0x3498db,
      title: `🎫 Ticket #${ticketNumber} Creado`,
      description: `Hola ${interaction.user}, bienvenido a tu ticket de soporte.\n\nUn miembro del staff te atenderá pronto.\n\n**Usa:**\n• \`/ticket close\` para cerrar el ticket`,
      footer: { text: `ID: ${ticket._id}` }
    };

    await channel.send({ 
      content: `${interaction.user} ¡Tu ticket ha sido creado!`,
      embeds: [embed]
    });

    await interaction.reply({
      content: `✅ Ticket creado: ${channel}`,
      ephemeral: true
    });
  }

  async closeTicket(interaction) {
    const channel = interaction.channel;
    
    const ticket = await Ticket.findOne({
      channelId: channel.id,
      status: 'open'
    });

    if (!ticket) {
      return interaction.reply({
        content: '❌ Este no es un canal de ticket válido.',
        ephemeral: true
      });
    }

    // Actualizar estado
    ticket.status = 'closed';
    ticket.closedAt = Date.now();
    ticket.closedBy = interaction.user.id;
    await ticket.save();

    const embed = {
      color: 0xe74c3c,
      title: '🔒 Ticket Cerrado',
      description: 'Este ticket ha sido cerrado por el staff.',
      fields: [
        { name: 'Cerrado por', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Fecha', value: new Date().toLocaleDateString(), inline: true }
      ]
    };

    await channel.send({ embeds: [embed] });
    
    // Opcional: Archivar o eliminar después de un tiempo
    setTimeout(async () => {
      await channel.delete();
    }, 30000); // 30 segundos

    await interaction.reply({
      content: '✅ Ticket cerrado y eliminado en 30 segundos.',
      ephemeral: true
    });
  }

  async listTickets(interaction) {
    const tickets = await Ticket.find({
      guildId: interaction.guild.id,
      userId: interaction.user.id
    }).sort({ createdAt: -1 }).limit(10);

    if (tickets.length === 0) {
      return interaction.reply({
        content: '❌ No has creado ningún ticket.',
        ephemeral: true
      });
    }

    let ticketList = '';
    tickets.forEach((ticket, index) => {
      const statusEmoji = ticket.status === 'open' ? '🟢' : '🔴';
      ticketList += `${index + 1}. ${statusEmoji} Ticket #${ticket.ticketNumber} - ${ticket.status}\n`;
    });

    const embed = {
      color: 0x9b59b6,
      title: '📋 Tus Tickets',
      description: ticketList,
      footer: { text: `Total: ${tickets.length} tickets` }
    };

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  async findOrCreateTicketCategory(guild) {
    let category = guild.channels.cache.find(
      c => c.type === 4 && c.name.toLowerCase() === 'tickets'
    );

    if (!category) {
      category = await guild.channels.create({
        name: 'Tickets',
        type: 4 // GUILD_CATEGORY
      });
    }

    return category;
  }
}

module.exports = TicketCommand;
