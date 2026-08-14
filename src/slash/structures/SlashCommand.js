const { SlashCommandBuilder } = require('discord.js');

module.exports = class SlashCommand {
  constructor(client, options = {}) {
    this.client = client;
    
    // Nombre del comando
    this.name = options.name || 'no-name';
    
    // Descripción (requerida para slash commands)
    this.description = options.description || 'Sin descripción';
    
    // Categoría
    this.category = options.category || 'General';
    
    // Permisos del bot
    this.botPermission = options.botPermission || ['SEND_MESSAGES'];
    
    // Permisos del usuario
    this.userPermission = options.userPermission || null;
    
    // Solo dueño
    this.ownerOnly = options.ownerOnly || false;
    
    // Solo servidor
    this.guildOnly = options.guildOnly !== false;
    
    // Enfriamiento en segundos
    this.cooldown = options.cooldown || 5;
    
    // Constructor del builder (se define en cada comando)
    this.data = options.data || new SlashCommandBuilder().setName(this.name).setDescription(this.description);
    
    // Track de cooldowns
    this.cooldowns = new Map();
  }

  /**
   * Método principal que debe ser implementado en cada comando
   * @param {ChatInputCommandInteraction} interaction 
   * @param {Client} client 
   */
  async run(interaction, client) {
    throw new Error(`El método run debe ser implementado en ${this.name}`);
  }

  /**
   * Verifica el cooldown del usuario
   * @param {string} userId 
   * @returns {number|null} Tiempo restante o null si no hay cooldown
   */
  getCooldown(userId) {
    if (!this.cooldowns.has(userId)) return null;
    
    const expirationTime = this.cooldowns.get(userId);
    const now = Date.now();
    
    if (now < expirationTime) {
      const remaining = Math.ceil((expirationTime - now) / 1000);
      return remaining;
    }
    
    this.cooldowns.delete(userId);
    return null;
  }

  /**
   * Establece el cooldown para un usuario
   * @param {string} userId 
   */
  setCooldown(userId) {
    this.cooldowns.set(userId, Date.now() + (this.cooldown * 1000));
  }

  /**
   * Registra el comando en el cliente
   */
  register() {
    this.client.slashCommands.set(this.name, this);
  }
};
