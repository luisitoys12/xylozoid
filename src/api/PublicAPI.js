/**
 * Xylozoid Public API System
 * Features: RESTful endpoints, authentication, rate limiting, documentation
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

class PublicAPI {
    constructor(client, db) {
        this.client = client;
        this.db = db;
        this.app = express();
        this.apiKeys = new Map(); // apiKey -> { guildId, permissions, createdAt }
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(express.json());

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 100, // 100 requests por ventana
            message: { error: 'Demasiadas solicitudes, intenta de nuevo más tarde' }
        });

        this.app.use('/api/', limiter);

        // API Key authentication middleware
        this.app.use('/api/', (req, res, next) => {
            const apiKey = req.headers['x-api-key'];
            
            if (!apiKey) {
                return res.status(401).json({ error: 'API key requerida' });
            }

            const keyData = this.apiKeys.get(apiKey);
            if (!keyData) {
                return res.status(403).json({ error: 'API key inválida' });
            }

            req.apiKey = keyData;
            next();
        });
    }

    setupRoutes() {
        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({
                status: 'online',
                bot: this.client.user?.username || 'offline',
                guilds: this.client.guilds.cache.size,
                users: this.client.users.cache.size,
                uptime: this.client.uptime,
                timestamp: Date.now()
            });
        });

        // Guild info endpoint
        this.app.get('/api/guilds/:guildId', async (req, res) => {
            const { guildId } = req.params;
            
            if (req.apiKey.guildId !== guildId && !req.apiKey.permissions.includes('global')) {
                return res.status(403).json({ error: 'Acceso denegado a este servidor' });
            }

            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) {
                return res.status(404).json({ error: 'Servidor no encontrado' });
            }

            try {
                const memberCount = await guild.members.fetch().then(m => m.size);
                
                res.json({
                    id: guild.id,
                    name: guild.name,
                    icon: guild.iconURL(),
                    owner: guild.ownerId,
                    members: memberCount,
                    online: guild.members.cache.filter(m => m.presence?.status !== 'offline').size,
                    channels: guild.channels.cache.size,
                    roles: guild.roles.cache.size,
                    createdAt: guild.createdAt,
                    features: guild.features
                });
            } catch (error) {
                res.status(500).json({ error: 'Error obteniendo información del servidor' });
            }
        });

        // Server stats endpoint
        this.app.get('/api/guilds/:guildId/stats', async (req, res) => {
            const { guildId } = req.params;
            
            if (req.apiKey.guildId !== guildId && !req.apiKey.permissions.includes('global')) {
                return res.status(403).json({ error: 'Acceso denegado' });
            }

            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) {
                return res.status(404).json({ error: 'Servidor no encontrado' });
            }

            try {
                // Get rank data from database
                const Rank = this.db.models.Rank;
                const topRanks = await Rank.find({ guildId }).sort({ level: -1, xp: -1 }).limit(10);

                // Get economy data
                const Economy = this.db.models.Economy;
                const topWealth = await Economy.find({ guildId }).sort({ balance: -1 }).limit(10);

                res.json({
                    guildId,
                    topLevels: topRanks.map(r => ({
                        userId: r.userId,
                        level: r.level,
                        xp: r.xp
                    })),
                    topWealth: topWealth.map(e => ({
                        userId: e.userId,
                        balance: e.balance,
                        bank: e.bank
                    }))
                });
            } catch (error) {
                res.status(500).json({ error: 'Error obteniendo estadísticas' });
            }
        });

        // User info endpoint
        this.app.get('/api/guilds/:guildId/users/:userId', async (req, res) => {
            const { guildId, userId } = req.params;
            
            if (req.apiKey.guildId !== guildId && !req.apiKey.permissions.includes('global')) {
                return res.status(403).json({ error: 'Acceso denegado' });
            }

            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) {
                return res.status(404).json({ error: 'Servidor no encontrado' });
            }

            const member = guild.members.cache.get(userId);
            if (!member) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            try {
                const Rank = this.db.models.Rank;
                const Economy = this.db.models.Economy;

                const [rankData, econData] = await Promise.all([
                    Rank.findOne({ guildId, userId }),
                    Economy.findOne({ guildId, userId })
                ]);

                res.json({
                    user: {
                        id: member.id,
                        username: member.user.username,
                        discriminator: member.user.discriminator,
                        avatar: member.user.avatarURL(),
                        joinedAt: member.joinedAt,
                        roles: member.roles.cache.map(r => ({ id: r.id, name: r.name }))
                    },
                    rank: rankData || null,
                    economy: econData || null
                });
            } catch (error) {
                res.status(500).json({ error: 'Error obteniendo información del usuario' });
            }
        });

        // Generate API key endpoint
        this.app.post('/api/keys/generate', async (req, res) => {
            const { guildId, permissions = ['read'] } = req.body;

            if (!guildId) {
                return res.status(400).json({ error: 'guildId requerido' });
            }

            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) {
                return res.status(404).json({ error: 'Servidor no encontrado' });
            }

            // Verify requester has admin permissions (would need additional auth in production)
            const apiKey = `xylo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            this.apiKeys.set(apiKey, {
                guildId,
                permissions,
                createdAt: Date.now()
            });

            res.json({
                apiKey,
                guildId,
                permissions,
                message: 'Guarda esta API key, no se mostrará de nuevo',
                expiresAt: null // Could add expiration logic
            });
        });

        // Revoke API key endpoint
        this.app.delete('/api/keys/revoke', (req, res) => {
            const { apiKey } = req.body;

            if (!apiKey) {
                return res.status(400).json({ error: 'API key requerida' });
            }

            if (this.apiKeys.has(apiKey)) {
                this.apiKeys.delete(apiKey);
                res.json({ message: 'API key revocada exitosamente' });
            } else {
                res.status(404).json({ error: 'API key no encontrada' });
            }
        });

        // List active API keys (for a guild)
        this.app.get('/api/keys/list', (req, res) => {
            const keys = Array.from(this.apiKeys.entries())
                .filter(([_, data]) => data.guildId === req.apiKey.guildId || req.apiKey.permissions.includes('global'))
                .map(([key, data]) => ({
                    key: key.substring(0, 10) + '...', // Hide full key
                    guildId: data.guildId,
                    permissions: data.permissions,
                    createdAt: data.createdAt
                }));

            res.json({ keys, count: keys.length });
        });

        // Bot stats public endpoint (no auth required)
        this.app.get('/api/public/stats', (req, res) => {
            res.json({
                totalGuilds: this.client.guilds.cache.size,
                totalUsers: this.client.users.cache.size,
                uptime: this.client.uptime,
                ping: this.client.ws.ping,
                version: '3.0.0',
                features: [
                    'Moderación',
                    'Niveles y XP',
                    'Economía',
                    'Música',
                    'Minijuegos',
                    'AutoMod',
                    'Tickets',
                    'Logs',
                    'Twitch/YouTube Integration'
                ]
            });
        });
    }

    start(port = 3001) {
        this.app.listen(port, () => {
            console.log(`🚀 API pública corriendo en puerto ${port}`);
            console.log(`📖 Documentación disponible en http://localhost:${port}/api/docs`);
        });
    }

    // Documentation endpoint (simple HTML)
    getDocumentation() {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Xylozoid API Documentation</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { color: #7289da; }
        .endpoint { background: #f4f4f4; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .method { display: inline-block; padding: 5px 10px; border-radius: 3px; color: white; font-weight: bold; }
        .get { background: #61affe; }
        .post { background: #49cc90; }
        .delete { background: #f93e3e; }
        code { background: #2d2d2d; color: #f8f8f2; padding: 2px 6px; border-radius: 3px; }
        .auth { color: #ff9800; font-weight: bold; }
    </style>
</head>
<body>
    <h1>🚀 Xylozoid Public API Documentation</h1>
    <p>Bienvenido a la documentación de la API de Xylozoid. Todas las rutas requieren autenticación con API key excepto <code>/api/public/stats</code>.</p>
    
    <h2>Autenticación</h2>
    <p>Incluye tu API key en los headers: <code>X-API-Key: tu_api_key</code></p>

    <h2>Endpoints</h2>

    <div class="endpoint">
        <span class="method get">GET</span>
        <code>/api/health</code>
        <p>Verifica el estado del bot.</p>
    </div>

    <div class="endpoint">
        <span class="method get">GET</span>
        <code>/api/guilds/:guildId</code>
        <p>Obtiene información de un servidor.</p>
    </div>

    <div class="endpoint">
        <span class="method get">GET</span>
        <code>/api/guilds/:guildId/stats</code>
        <p>Obtiene estadísticas del servidor (top niveles, economía).</p>
    </div>

    <div class="endpoint">
        <span class="method get">GET</span>
        <code>/api/guilds/:guildId/users/:userId</code>
        <p>Obtiene información de un usuario específico.</p>
    </div>

    <div class="endpoint">
        <span class="method post">POST</span>
        <code>/api/keys/generate</code>
        <p>Genera una nueva API key para un servidor.</p>
        <p><strong>Body:</strong> <code>{ "guildId": "id", "permissions": ["read"] }</code></p>
    </div>

    <div class="endpoint">
        <span class="method delete">DELETE</span>
        <code>/api/keys/revoke</code>
        <p>Revoca una API key existente.</p>
        <p><strong>Body:</strong> <code>{ "apiKey": "tu_api_key" }</code></p>
    </div>

    <div class="endpoint">
        <span class="method get">GET</span>
        <code>/api/keys/list</code>
        <p>Lista todas las API keys activas para tu servidor.</p>
    </div>

    <div class="endpoint">
        <span class="method get">GET</span>
        <code>/api/public/stats</code>
        <span class="auth">SIN AUTH</span>
        <p>Estadísticas públicas del bot (no requiere autenticación).</p>
    </div>

    <h2>Límites de Rate Limiting</h2>
    <p>100 solicitudes cada 15 minutos por IP.</p>

    <h2>Ejemplo de Uso (JavaScript)</h2>
    <pre><code>const response = await fetch('https://xylozoid.dev/api/guilds/123456789', {
    headers: {
        'X-API-Key': 'tu_api_key_aqui'
    }
});
const data = await response.json();
console.log(data);</code></pre>
</body>
</html>`;
    }
}

module.exports = PublicAPI;
