/**
 * Xylozoid Embeddable Widgets System
 * Features: Server stats widget, rank card generator, leaderboards embeddables
 */

const { createCanvas, loadImage, registerFont } = require('canvas');
const express = require('express');

class WidgetsSystem {
    constructor(client, db) {
        this.client = client;
        this.db = db;
        this.app = express();
        
        // Register fonts if needed
        // registerFont('./fonts/Roboto.ttf', { family: 'Roboto' });
        
        this.setupRoutes();
    }

    setupRoutes() {
        // Server Stats Widget (SVG)
        this.app.get('/widget/server/:guildId.svg', async (req, res) => {
            const { guildId } = req.params;
            const guild = this.client.guilds.cache.get(guildId);
            
            if (!guild) {
                return res.status(404).send('Servidor no encontrado');
            }

            try {
                const memberCount = await guild.members.fetch().then(m => m.size);
                const onlineCount = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
                const svg = this.generateServerWidgetSVG(guild, memberCount, onlineCount);
                
                res.setHeader('Content-Type', 'image/svg+xml');
                res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min cache
                res.send(svg);
            } catch (error) {
                res.status(500).send('Error generando widget');
            }
        });

        // Server Stats Widget (PNG)
        this.app.get('/widget/server/:guildId.png', async (req, res) => {
            const { guildId } = req.params;
            const width = parseInt(req.query.width) || 400;
            const height = parseInt(req.query.height) || 150;
            
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) {
                return res.status(404).send('Servidor no encontrado');
            }

            try {
                const memberCount = await guild.members.fetch().then(m => m.size);
                const onlineCount = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
                
                const canvas = await this.generateServerWidgetPNG(guild, memberCount, onlineCount, width, height);
                
                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Cache-Control', 'public, max-age=300');
                res.send(canvas.toBuffer('image/png'));
            } catch (error) {
                res.status(500).send('Error generando widget');
            }
        });

        // Rank Card Generator
        this.app.get('/widget/rank/:guildId/:userId.png', async (req, res) => {
            const { guildId, userId } = req.params;
            
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) {
                return res.status(404).send('Servidor no encontrado');
            }

            const member = guild.members.cache.get(userId);
            if (!member) {
                return res.status(404).send('Usuario no encontrado');
            }

            try {
                const Rank = this.db.models.Rank;
                const rankData = await Rank.findOne({ guildId, userId });
                
                const canvas = await this.generateRankCard(member, rankData, guild);
                
                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Cache-Control', 'public, max-age=60'); // 1 min cache
                res.send(canvas.toBuffer('image/png'));
            } catch (error) {
                res.status(500).send('Error generando rank card');
            }
        });

        // Leaderboard Widget (Top 5)
        this.app.get('/widget/leaderboard/:guildId.png', async (req, res) => {
            const { guildId } = req.params;
            
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) {
                return res.status(404).send('Servidor no encontrado');
            }

            try {
                const Rank = this.db.models.Rank;
                const topRanks = await Rank.find({ guildId }).sort({ level: -1, xp: -1 }).limit(5);
                
                const canvas = await this.generateLeaderboardWidget(guild, topRanks);
                
                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Cache-Control', 'public, max-age=300');
                res.send(canvas.toBuffer('image/png'));
            } catch (error) {
                res.status(500).send('Error generando leaderboard');
            }
        });

        // Embeddable HTML Widget
        this.app.get('/widget/embed/:guildId', async (req, res) => {
            const { guildId } = req.params;
            
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) {
                return res.status(404).send('Servidor no encontrado');
            }

            try {
                const memberCount = await guild.members.fetch().then(m => m.size);
                const onlineCount = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
                
                const html = this.generateEmbedHTML(guild, memberCount, onlineCount);
                
                res.setHeader('Content-Type', 'text/html');
                res.send(html);
            } catch (error) {
                res.status(500).send('Error generando widget');
            }
        });

        // JSON API for widgets
        this.app.get('/widget/data/:guildId', async (req, res) => {
            const { guildId } = req.params;
            
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) {
                return res.status(404).json({ error: 'Servidor no encontrado' });
            }

            try {
                const memberCount = await guild.members.fetch().then(m => m.size);
                const onlineCount = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
                
                const Rank = this.db.models.Rank;
                const Economy = this.db.models.Economy;
                
                const [topRanks, topWealth] = await Promise.all([
                    Rank.find({ guildId }).sort({ level: -1, xp: -1 }).limit(5),
                    Economy.find({ guildId }).sort({ balance: -1 }).limit(5)
                ]);

                res.json({
                    guild: {
                        id: guild.id,
                        name: guild.name,
                        icon: guild.iconURL({ extension: 'png', size: 256 }),
                        members: memberCount,
                        online: onlineCount
                    },
                    topRanks: topRanks.map(r => ({
                        userId: r.userId,
                        level: r.level,
                        xp: r.xp
                    })),
                    topWealth: topWealth.map(e => ({
                        userId: e.userId,
                        balance: e.balance
                    }))
                });
            } catch (error) {
                res.status(500).json({ error: 'Error obteniendo datos' });
            }
        });
    }

    generateServerWidgetSVG(guild, members, online) {
        const gradientId = `grad-${guild.id}`;
        
        return `
<svg width="400" height="150" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#7289da;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#5b6eae;stop-opacity:1" />
        </linearGradient>
    </defs>
    
    <!-- Background -->
    <rect width="400" height="150" rx="10" fill="url(#${gradientId})"/>
    
    <!-- Server Icon -->
    <circle cx="60" cy="75" r="35" fill="#fff"/>
    ${guild.iconURL() ? `<image href="${guild.iconURL({ extension: 'png', size: 128 })}" x="25" y="40" width="70" height="70" clip-path="circle(35px at 60px 75px)"/>` : ''}
    
    <!-- Server Name -->
    <text x="110" y="55" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#fff">
        ${this.escapeXml(guild.name.substring(0, 25))}
    </text>
    
    <!-- Members -->
    <text x="110" y="85" font-family="Arial, sans-serif" font-size="14" fill="#e0e0e0">
        👥 ${members.toLocaleString()} miembros
    </text>
    
    <!-- Online -->
    <text x="110" y="110" font-family="Arial, sans-serif" font-size="14" fill="#43b581" font-weight="bold">
        🟢 ${online.toLocaleString()} en línea
    </text>
    
    <!-- Powered by -->
    <text x="390" y="140" font-family="Arial, sans-serif" font-size="10" fill="#aaa" text-anchor="end">
        Powered by Xylozoid
    </text>
</svg>`;
    }

    async generateServerWidgetPNG(guild, members, online, width, height) {
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#7289da');
        gradient.addColorStop(1, '#5b6eae');
        ctx.fillStyle = gradient;
        ctx.roundRect(0, 0, width, height, 10);
        ctx.fill();

        // Server info
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(guild.name.substring(0, 20), 100, 40);

        ctx.font = '16px Arial';
        ctx.fillStyle = '#e0e0e0';
        ctx.fillText(`👥 ${members.toLocaleString()} miembros`, 100, 70);

        ctx.fillStyle = '#43b581';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`🟢 ${online.toLocaleString()} en línea`, 100, 100);

        // Footer
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('Powered by Xylozoid', width - 10, height - 10);

        return canvas;
    }

    async generateRankCard(member, rankData, guild) {
        const canvas = createCanvas(600, 200);
        const ctx = canvas.getContext('2d');

        // Background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#2c2f33');
        gradient.addColorStop(1, '#23272a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Avatar
        const avatarUrl = member.user.avatarURL({ extension: 'png', size: 256 }) || member.user.defaultAvatarURL;
        const avatar = await loadImage(avatarUrl);
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(100, 100, 70, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 30, 30, 140, 140);
        ctx.restore();

        // Username
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial';
        ctx.fillText(member.user.username, 200, 70);

        // Level
        const level = rankData?.level || 0;
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(`Nivel ${level}`, 200, 110);

        // XP Progress
        const xp = rankData?.xp || 0;
        const nextLevelXp = level * 100;
        const prevLevelXp = (level - 1) * 100;
        const progress = ((xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 300;

        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(200, 130, 300, 20);

        ctx.fillStyle = '#7289da';
        ctx.fillRect(200, 130, Math.max(0, progress), 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.fillText(`${xp} / ${nextLevelXp} XP`, 200, 160);

        // Rank position
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`#${rankData?.position || 'N/A'} en el servidor`, 580, 70);

        return canvas;
    }

    async generateLeaderboardWidget(guild, topRanks) {
        const canvas = createCanvas(500, 300);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#2c2f33';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`🏆 Top 5 - ${guild.name}`, canvas.width / 2, 40);

        // Entries
        ctx.textAlign = 'left';
        for (let i = 0; i < topRanks.length; i++) {
            const rank = topRanks[i];
            const member = guild.members.cache.get(rank.userId);
            const y = 80 + (i * 40);

            // Rank number
            ctx.fillStyle = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#ffffff';
            ctx.font = 'bold 20px Arial';
            ctx.fillText(`#${i + 1}`, 20, y);

            // Username
            ctx.fillStyle = '#ffffff';
            ctx.font = '18px Arial';
            ctx.fillText(member ? member.user.username : 'Usuario desconocido', 70, y);

            // Level
            ctx.fillStyle = '#7289da';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(`Nvl ${rank.level}`, canvas.width - 20, y);
            ctx.textAlign = 'left';
        }

        return canvas;
    }

    generateEmbedHTML(guild, members, online) {
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .widget { 
            background: linear-gradient(135deg, #7289da, #5b6eae);
            border-radius: 10px;
            padding: 20px;
            color: white;
            width: 380px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .header { display: flex; align-items: center; margin-bottom: 15px; }
        .icon { width: 60px; height: 60px; border-radius: 50%; margin-right: 15px; background: white; }
        .name { font-size: 18px; font-weight: bold; }
        .stats { display: flex; justify-content: space-between; }
        .stat { text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; }
        .stat-label { font-size: 12px; opacity: 0.8; }
        .online { color: #43b581; }
        .footer { margin-top: 15px; font-size: 10px; opacity: 0.6; text-align: right; }
    </style>
</head>
<body>
    <div class="widget">
        <div class="header">
            <img class="icon" src="${guild.iconURL({ extension: 'png', size: 128 }) || 'https://via.placeholder.com/60'}" alt="${guild.name}">
            <div class="name">${this.escapeHtml(guild.name)}</div>
        </div>
        <div class="stats">
            <div class="stat">
                <div class="stat-value">👥 ${members.toLocaleString()}</div>
                <div class="stat-label">Miembros</div>
            </div>
            <div class="stat">
                <div class="stat-value online">🟢 ${online.toLocaleString()}</div>
                <div class="stat-label">En línea</div>
            </div>
        </div>
        <div class="footer">Powered by Xylozoid Bot</div>
    </div>
</body>
</html>`;
    }

    escapeXml(unsafe) {
        return unsafe.replace(/[<>&'"]/g, c => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    start(port = 3002) {
        this.app.listen(port, () => {
            console.log(`🎨 Widgets server corriendo en puerto ${port}`);
        });
    }
}

module.exports = WidgetsSystem;
