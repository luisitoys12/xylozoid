#!/usr/bin/env node

/**
 * Script de Verificación de Licencia - Xylozoid
 * 
 * Este script valida la licencia antes de iniciar el bot.
 * Uso: npm run verify-license
 */

require('dotenv').config();
const { licenseValidator, LICENSE_CONFIG } = require('../src/utils/LicenseManager');

async function verifyLicense() {
  const licenseKey = process.env.XYLOZOID_LICENSE_KEY;

  console.log('🔐 Verificando licencia de Xylozoid...\n');

  if (!licenseKey) {
    console.error('❌ ERROR: No se encontró XYLOZOID_LICENSE_KEY en .env');
    console.error('   Por favor, configura tu licencia en el archivo .env');
    console.error('   Usa XYLOZOID_LICENSE_KEY=OWNER si eres el dueño del proyecto\n');
    process.exit(1);
  }

  console.log(`📝 Clave detectada: ${licenseKey.substring(0, 3)}***`);
  
  const result = await licenseValidator.validateLicense(licenseKey);

  if (result.valid) {
    console.log('\n✅ LICENCIA VÁLIDA\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Tipo: ${result.type}`);
    console.log(`   Características: ${result.features}`);
    if (result.expiresAt) {
      const expires = new Date(result.expiresAt);
      console.log(`   Expiración: ${expires.toLocaleDateString()}`);
    } else {
      console.log(`   Expiración: ∞ (Sin límite)`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🚀 ¡Xylozoid está listo para iniciar!\n');
    process.exit(0);
  } else {
    console.error('\n❌ LICENCIA INVÁLIDA\n');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`   Error: ${result.error || LICENSE_CONFIG.MESSAGES.INVALID}`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.error('💡 Soluciones:');
    console.error('   1. Si eres el dueño: usa XYLOZOID_LICENSE_KEY=OWNER');
    console.error('   2. Para desarrollo: asegúrate de NODE_ENV=development');
    console.error('   3. Para producción: compra una licencia en xylozoid.dev/pricing\n');
    process.exit(1);
  }
}

verifyLicense().catch(err => {
  console.error('❌ Error inesperado:', err.message);
  process.exit(1);
});
