/**
 * Configuración de Licencia - Xylozoid
 * 
 * Este módulo maneja la validación de licencias para usuarios premium.
 * El dueño del proyecto (modo OWNER) tiene acceso total sin validación.
 */

const LICENSE_CONFIG = {
  // Claves especiales que bypassan la validación
  OWNER_KEYS: ['OWNER', 'DEVELOPER', 'ADMIN'],
  
  // URL del servidor de licencias (para producción)
  LICENSE_SERVER_URL: process.env.LICENSE_SERVER_URL || 'https://api.xylozoid.dev/licenses',
  
  // Tiempo de cacheo de validación (en ms)
  CACHE_TTL: 5 * 60 * 1000, // 5 minutos
  
  // Mensajes de error personalizados
  MESSAGES: {
    INVALID: '❌ Licencia inválida o expirada. Contacta a soporte.',
    EXPIRED: '⚠️ Tu licencia ha expirado. Renueva tu plan para continuar.',
    SUSPENDED: '🚫 Esta licencia ha sido suspendida por violar los términos.',
    OWNER: '👑 Modo Dueño activado - Acceso completo concedido.'
  }
};

class LicenseValidator {
  constructor() {
    this.cache = new Map();
    this.isOwner = false;
  }

  /**
   * Verifica si la clave de licencia es del dueño
   */
  isOwnerKey(key) {
    return LICENSE_CONFIG.OWNER_KEYS.includes(key);
  }

  /**
   * Valida una licencia (simulado para desarrollo)
   * En producción, esto haría una petición al servidor de licencias
   */
  async validateLicense(licenseKey) {
    // Modo dueño - siempre válido
    if (this.isOwnerKey(licenseKey)) {
      this.isOwner = true;
      console.log('✅', LICENSE_CONFIG.MESSAGES.OWNER);
      return {
        valid: true,
        type: 'OWNER',
        features: 'ALL',
        expiresAt: null
      };
    }

    // Verificar cache
    if (this.cache.has(licenseKey)) {
      const cached = this.cache.get(licenseKey);
      if (Date.now() < cached.expiresAt) {
        return cached.data;
      }
    }

    // En producción, aquí iría la llamada a la API
    // Por ahora, simulamos validación para desarrollo
    if (process.env.NODE_ENV === 'development') {
      const mockLicense = {
        valid: true,
        type: 'PREMIUM',
        features: 'ALL',
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 año
      };
      
      this.cache.set(licenseKey, {
        data: mockLicense,
        expiresAt: Date.now() + LICENSE_CONFIG.CACHE_TTL
      });
      
      console.log('🔧 Modo desarrollo: Licencia simulada válida');
      return mockLicense;
    }

    // Validación real en producción (implementar cuando tengas el servidor)
    try {
      const response = await fetch(`${LICENSE_CONFIG.LICENSE_SERVER_URL}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey })
      });
      
      const data = await response.json();
      
      if (!data.valid) {
        throw new Error(LICENSE_CONFIG.MESSAGES.INVALID);
      }
      
      this.cache.set(licenseKey, {
        data,
        expiresAt: Date.now() + LICENSE_CONFIG.CACHE_TTL
      });
      
      return data;
    } catch (error) {
      console.error('❌ Error validando licencia:', error.message);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Obtiene las características disponibles según el tipo de licencia
   */
  getFeatures(licenseType) {
    const features = {
      OWNER: ['ALL'],
      DIAMOND: ['ALL', 'IA_MODERATION', 'CLANS', 'ADVANCED_ANALYTICS'],
      GOLD: ['MODERATION', 'MUSIC', 'ECONOMY', 'LEVELS', 'TICKETS'],
      BASIC: ['MODERATION', 'LEVELS'],
      FREE: []
    };
    
    return features[licenseType] || features.FREE;
  }

  /**
   * Verifica si una licencia tiene una característica específica
   */
  hasFeature(licenseType, feature) {
    const features = this.getFeatures(licenseType);
    return features.includes('ALL') || features.includes(feature);
  }
}

// Exportar instancia singleton
const licenseValidator = new LicenseValidator();

module.exports = {
  LicenseValidator,
  licenseValidator,
  LICENSE_CONFIG
};
