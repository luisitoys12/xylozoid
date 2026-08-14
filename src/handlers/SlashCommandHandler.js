const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = class SlashCommandLoader {
  constructor(client) {
    this.client = client;
    this.commands = [];
  }

  /**
   * Carga todos los comandos slash desde el directorio
   */
  async loadCommands() {
    const commandDir = path.join(__dirname, '../slash');
    
    // Recorrer subdirectorios y cargar comandos
    const categories = fs.readdirSync(commandDir).filter(file => 
      fs.statSync(path.join(commandDir, file)).isDirectory()
    );

    for (const category of categories) {
      const categoryPath = path.join(commandDir, category);
      const commandFiles = fs.readdirSync(categoryPath).filter(file => 
        file.endsWith('.js')
      );

      for (const file of commandFiles) {
        const filePath = path.join(categoryPath, file);
        const CommandClass = require(filePath);
        const command = new CommandClass(this.client);
        
        // Registrar comando en la colección del cliente
        if (command.build) {
          command.build();
          this.commands.push(command.data.toJSON());
        }
        
        this.client.slashCommands.set(command.name, command);
        console.log(`[SLASH] Comando cargado: ${command.name} (${category})`);
      }
    }

    console.log(`[SLASH] Total de comandos cargados: ${this.commands.length}`);
  }

  /**
   * Registra los comandos slash en Discord (global o por guild)
   * @param {string} clientId - ID del bot
   * @param {string} token - Token del bot
   * @param {string} guildId - ID del servidor (opcional, para registro rápido)
   */
  async registerCommands(clientId, token, guildId = null) {
    const rest = new REST({ version: '10' }).setToken(token);

    try {
      console.log('[SLASH] Registrando comandos slash...');

      if (guildId) {
        // Registro rápido en un servidor específico (para testing)
        await rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: this.commands }
        );
        console.log(`[SLASH] Comandos registrados en el servidor ${guildId}`);
      } else {
        // Registro global (puede tardar hasta 1 hora)
        await rest.put(
          Routes.applicationCommands(clientId),
          { body: this.commands }
        );
        console.log('[SLASH] Comandos registrados globalmente');
      }

      console.log('[SLASH] ✅ Comandos slash registrados exitosamente');
    } catch (error) {
      console.error('[SLASH] Error al registrar comandos:', error);
    }
  }

  /**
   * Maneja la interacción de comandos slash
   * @param {ChatInputCommandInteraction} interaction 
   */
  async handleInteraction(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = this.client.slashCommands.get(interaction.commandName);
    
    if (!command) {
      console.error(`Comando no encontrado: ${interaction.commandName}`);
      return;
    }

    try {
      // Verificar permisos del usuario
      if (command.userPermission) {
        const hasPermission = interaction.member.permissions.has(command.userPermission);
        if (!hasPermission) {
          return interaction.reply({
            content: '❌ No tienes permisos para usar este comando.',
            ephemeral: true
          });
        }
      }

      // Verificar cooldown
      const cooldown = command.getCooldown(interaction.user.id);
      if (cooldown) {
        return interaction.reply({
          content: `⏰ Por favor espera ${cooldown} segundos antes de usar este comando nuevamente.`,
          ephemeral: true
        });
      }

      // Ejecutar comando
      await command.run(interaction, this.client);
      
      // Establecer cooldown
      if (command.cooldown > 0) {
        command.setCooldown(interaction.user.id);
      }

    } catch (error) {
      console.error(`Error ejecutando comando ${interaction.commandName}:`, error);
      
      const errorMessage = {
        content: '❌ Ocurrió un error al ejecutar este comando.',
        ephemeral: true
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }
};
