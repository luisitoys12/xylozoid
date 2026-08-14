/**
 * Xylozoid Twitch & YouTube Integration System
 * Features: Live stream notifications, auto-posting, event tracking
 */

const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

class StreamIntegration {
    constructor(client) {
        this.client = client;
        this.twitchClientId = process.env.TWITCH_CLIENT_ID;
        this.twitchToken = null;
        this.youtubeApiKey = process.env.YOUTUBE_API_KEY;
        this.trackedChannels = new Map(); // guildId -> { twitch: [], youtube: [] }
        this.lastLiveStatus = new Map(); // channelId -> isLive
        this.pollInterval = 60000; // 1 minuto
    }

    // === TWITCH INTEGRATION ===
    
    async getTwitchToken() {
        if (this.twitchToken && !this.isTokenExpired()) {
            return this.twitchToken;
        }

        try {
            const response = await axios.post(
                'https://id.twitch.tv/oauth2/token',
                null,
                {
                    params: {
                        client_id: this.twitchClientId,
                        client_secret: process.env.TWITCH_CLIENT_SECRET,
                        grant_type: 'client_credentials'
                    }
                }
            );

            this.twitchToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
            
            return this.twitchToken;
        } catch (error) {
            console.error('Error getting Twitch token:', error);
            return null;
        }
    }

    isTokenExpired() {
        return Date.now() >= (this.tokenExpiry - 300000); // 5 min antes de expirar
    }

    async getTwitchChannelInfo(username) {
        const token = await this.getTwitchToken();
        if (!token) return null;

        try {
            const response = await axios.get(
                `https://api.twitch.tv/helix/users?login=${username}`,
                {
                    headers: {
                        'Client-ID': this.twitchClientId,
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.data.data.length === 0) return null;
            return response.data.data[0];
        } catch (error) {
            console.error('Error getting Twitch channel info:', error);
            return null;
        }
    }

    async checkTwitchStream(userId) {
        const token = await this.getTwitchToken();
        if (!token) return null;

        try {
            const response = await axios.get(
                `https://api.twitch.tv/helix/streams?user_id=${userId}`,
                {
                    headers: {
                        'Client-ID': this.twitchClientId,
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const streams = response.data.data;
            return streams.length > 0 ? streams[0] : null;
        } catch (error) {
            console.error('Error checking Twitch stream:', error);
            return null;
        }
    }

    async trackTwitchChannel(guildId, twitchUsername, channelId) {
        if (!this.trackedChannels.has(guildId)) {
            this.trackedChannels.set(guildId, { twitch: [], youtube: [] });
        }

        const channelInfo = await this.getTwitchChannelInfo(twitchUsername);
        if (!channelInfo) {
            return { success: false, error: 'Canal de Twitch no encontrado' };
        }

        const trackingData = {
            username: twitchUsername,
            userId: channelInfo.id,
            displayName: channelInfo.display_name,
            profileImageUrl: channelInfo.profile_image_url,
            channelId,
            lastNotified: null
        };

        const existing = this.trackedChannels.get(guildId).twitch.find(
            t => t.userId === channelInfo.id
        );

        if (existing) {
            return { success: false, error: 'Este canal ya está siendo rastreado' };
        }

        this.trackedChannels.get(guildId).twitch.push(trackingData);
        this.lastLiveStatus.set(channelInfo.id, false);

        return { success: true, message: `Rastreando a ${channelInfo.display_name}` };
    }

    async untrackTwitchChannel(guildId, twitchUsername) {
        if (!this.trackedChannels.has(guildId)) {
            return { success: false, error: 'No hay canales rastreados' };
        }

        const channelInfo = await this.getTwitchChannelInfo(twitchUsername);
        if (!channelInfo) {
            return { success: false, error: 'Canal no encontrado' };
        }

        const twitchList = this.trackedChannels.get(guildId).twitch;
        const index = twitchList.findIndex(t => t.userId === channelInfo.id);

        if (index === -1) {
            return { success: false, error: 'Canal no being rastreado' };
        }

        twitchList.splice(index, 1);
        this.lastLiveStatus.delete(channelInfo.id);

        return { success: true, message: `Dejando de rastrear a ${channelInfo.display_name}` };
    }

    // === YOUTUBE INTEGRATION ===

    async getYouTubeChannelInfo(channelIdOrUsername) {
        if (!this.youtubeApiKey) {
            console.error('YouTube API key not configured');
            return null;
        }

        try {
            // Try as channel ID first
            let url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIdOrUsername}&key=${this.youtubeApiKey}`;
            
            let response = await axios.get(url);
            
            if (response.data.items.length === 0) {
                // Try as username
                url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forUsername=${channelIdOrUsername}&key=${this.youtubeApiKey}`;
                response = await axios.get(url);
            }

            if (response.data.items.length === 0) return null;
            return response.data.items[0];
        } catch (error) {
            console.error('Error getting YouTube channel info:', error);
            return null;
        }
    }

    async checkYouTubeVideos(channelId) {
        if (!this.youtubeApiKey) return null;

        try {
            const response = await axios.get(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=1&type=video&key=${this.youtubeApiKey}`
            );

            if (response.data.items.length === 0) return null;
            return response.data.items[0];
        } catch (error) {
            console.error('Error checking YouTube videos:', error);
            return null;
        }
    }

    async trackYouTubeChannel(guildId, channelIdOrUsername, discordChannelId) {
        if (!this.trackedChannels.has(guildId)) {
            this.trackedChannels.set(guildId, { twitch: [], youtube: [] });
        }

        const channelInfo = await this.getYouTubeChannelInfo(channelIdOrUsername);
        if (!channelInfo) {
            return { success: false, error: 'Canal de YouTube no encontrado' };
        }

        const trackingData = {
            channelId: channelInfo.id,
            channelTitle: channelInfo.snippet.title,
            customUrl: channelInfo.snippet.customUrl,
            thumbnail: channelInfo.snippet.thumbnails.high.url,
            discordChannelId,
            lastVideoId: null
        };

        const existing = this.trackedChannels.get(guildId).youtube.find(
            y => y.channelId === channelInfo.id
        );

        if (existing) {
            return { success: false, error: 'Este canal ya está siendo rastreado' };
        }

        // Initialize with latest video
        const latestVideo = await this.checkYouTubeVideos(channelInfo.id);
        if (latestVideo) {
            trackingData.lastVideoId = latestVideo.id.videoId;
        }

        this.trackedChannels.get(guildId).youtube.push(trackingData);

        return { success: true, message: `Rastreando a ${channelInfo.snippet.title}` };
    }

    async untrackYouTubeChannel(guildId, channelIdOrUsername) {
        if (!this.trackedChannels.has(guildId)) {
            return { success: false, error: 'No hay canales rastreados' };
        }

        const channelInfo = await this.getYouTubeChannelInfo(channelIdOrUsername);
        if (!channelInfo) {
            return { success: false, error: 'Canal no encontrado' };
        }

        const youtubeList = this.trackedChannels.get(guildId).youtube;
        const index = youtubeList.findIndex(y => y.channelId === channelInfo.id);

        if (index === -1) {
            return { success: false, error: 'Canal no being rastreado' };
        }

        youtubeList.splice(index, 1);

        return { success: true, message: `Dejando de rastrear a ${channelInfo.snippet.title}` };
    }

    // === NOTIFICATION SYSTEM ===

    async startMonitoring() {
        setInterval(() => this.checkAllStreams(), this.pollInterval);
        console.log('Stream monitoring started');
    }

    async checkAllStreams() {
        for (const [guildId, tracked] of this.trackedChannels.entries()) {
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) continue;

            // Check Twitch streams
            for (const channel of tracked.twitch) {
                await this.checkTwitchStreamNotification(guild, channel);
            }

            // Check YouTube videos
            for (const channel of tracked.youtube) {
                await this.checkYouTubeVideoNotification(guild, channel);
            }
        }
    }

    async checkTwitchStreamNotification(guild, channelData) {
        const stream = await this.checkTwitchStream(channelData.userId);
        const wasLive = this.lastLiveStatus.get(channelData.userId);

        if (stream && !wasLive) {
            // Stream started
            await this.sendTwitchNotification(guild, channelData, stream);
            this.lastLiveStatus.set(channelData.userId, true);
        } else if (!stream && wasLive) {
            // Stream ended
            this.lastLiveStatus.set(channelData.userId, false);
        }
    }

    async sendTwitchNotification(guild, channelData, stream) {
        const channel = guild.channels.cache.get(channelData.channelId);
        if (!channel) return;

        const gameName = stream.game_name || 'Just Chatting';
        const viewerCount = stream.viewer_count.toLocaleString();

        const embed = new EmbedBuilder()
            .setTitle(`🔴 ¡${stream.user_name} está en vivo!`)
            .setDescription(stream.title)
            .setURL(`https://twitch.tv/${channelData.username}`)
            .setColor('#9146FF')
            .setThumbnail(channelData.profileImageUrl)
            .addFields(
                { name: 'Juego/Categoría', value: gameName, inline: true },
                { name: 'Espectadores', value: viewerCount, inline: true }
            )
            .setImage(stream.thumbnail_url.replace('{width}', '640').replace('{height}', '360'))
            .setFooter({ text: 'Twitch • En vivo ahora' })
            .setTimestamp();

        await channel.send({ 
            content: `@everyone ¡${channelData.displayName} ha comenzado un stream!`,
            embeds: [embed] 
        });
    }

    async checkYouTubeVideoNotification(guild, channelData) {
        const latestVideo = await this.checkYouTubeVideos(channelData.channelId);
        if (!latestVideo) return;

        if (latestVideo.id.videoId !== channelData.lastVideoId) {
            await this.sendYouTubeNotification(guild, channelData, latestVideo);
            channelData.lastVideoId = latestVideo.id.videoId;
        }
    }

    async sendYouTubeNotification(guild, channelData, video) {
        const channel = guild.channels.cache.get(channelData.discordChannelId);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle(`📹 ¡Nuevo video de ${channelData.channelTitle}!`)
            .setDescription(video.snippet.description.substring(0, 200) + '...')
            .setURL(`https://youtube.com/watch?v=${video.id.videoId}`)
            .setColor('#FF0000')
            .setThumbnail(channelData.thumbnail)
            .setImage(video.snippet.thumbnails.high.url)
            .addFields({ name: 'Publicado', value: new Date(video.snippet.publishedAt).toLocaleDateString(), inline: true })
            .setFooter({ text: 'YouTube • Nuevo video' })
            .setTimestamp();

        await channel.send({ 
            content: `@everyone ¡${channelData.channelTitle} ha subido un nuevo video!`,
            embeds: [embed] 
        });
    }

    // === MANAGEMENT ===

    getTrackedChannels(guildId) {
        return this.trackedChannels.get(guildId) || { twitch: [], youtube: [] };
    }

    getAllTrackedChannels() {
        return this.trackedChannels;
    }

    clearGuildTracking(guildId) {
        this.trackedChannels.delete(guildId);
    }
}

module.exports = StreamIntegration;
