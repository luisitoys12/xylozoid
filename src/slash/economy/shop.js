const SlashCommand = require('../structures/SlashCommand');
const Economy = require('../../database/schemas/Economy');

class ShopCommand extends SlashCommand {
  constructor(client) {
    super(client, {
      name: 'shop',
      description: 'Ver la tienda de items',
      category: 'Economy',
      options: [
        {
          name: 'item',
          type: 3, // STRING
          description: 'Item a comprar (opcional)',
          required: false,
          choices: [
            { name: '🍎 Manzana - 50 coins', value: 'apple' },
            { name: '⚔️ Espada - 500 coins', value: 'sword' },
            { name: '🛡️ Escudo - 300 coins', value: 'shield' },
            { name: '🧪 Poción - 100 coins', value: 'potion' }
          ]
        }
      ]
    });
  }

  async run(interaction) {
    const itemOption = interaction.options.getString('item');
    
    const shopItems = {
      apple: { name: '🍎 Manzana', price: 50, description: 'Recupera energía' },
      sword: { name: '⚔️ Espada', price: 500, description: 'Aumenta poder de ataque' },
      shield: { name: '🛡️ Escudo', price: 300, description: 'Mejora defensa' },
      potion: { name: '🧪 Poción', price: 100, description: 'Efectos mágicos' }
    };

    if (!itemOption) {
      // Mostrar tienda completa
      let shopList = '';
      for (const [key, item] of Object.entries(shopItems)) {
        shopList += `• ${item.name} - **${item.price}** coins\n  _${item.description}_\n\n`;
      }

      const embed = {
        color: 0xffaa00,
        title: '🏪 Tienda de Items',
        description: shopList + '\nUsa `/shop item:<nombre>` para comprar.',
        footer: { text: 'Los items se guardan en tu inventario' }
      };

      return interaction.reply({ embeds: [embed] });
    }

    // Comprar item
    const item = shopItems[itemOption];
    if (!item) {
      return interaction.reply({ 
        content: '❌ Item no encontrado.', 
        ephemeral: true 
      });
    }

    let economy = await Economy.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
    
    if (!economy || economy.balance < item.price) {
      return interaction.reply({ 
        content: `❌ No tienes suficientes monedas. Necesitas **${item.price}** coins.`, 
        ephemeral: true 
      });
    }

    economy.balance -= item.price;
    if (!economy.inventory) economy.inventory = [];
    economy.inventory.push(itemOption);
    await economy.save();

    const embed = {
      color: 0x00ff88,
      title: '✅ ¡Compra Exitosa!',
      description: `Has comprado **${item.name}** por **${item.price}** coins.`,
      fields: [
        { name: 'Balance Restante', value: `${economy.balance} coins`, inline: true },
        { name: 'Items en Inventario', value: `${economy.inventory.length}`, inline: true }
      ]
    };

    await interaction.reply({ embeds: [embed] });
  }
}

module.exports = ShopCommand;
