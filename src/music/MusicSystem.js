/**
 * Xylozoid Music System - Optimized Audio Player
 * Features: High-quality streaming, filters, queue management, 24/7 mode
 */

const { Client, VoiceChannel, GuildQueue } = require('discord.js');
const { Player, QueueRepeatMode, Extractor } = require('@discord-player/extractor');

class MusicSystem {
    constructor(client) {
        this.client = client;
        this.player = null;
        this.initializePlayer();
    }

    initializePlayer() {
        this.player = new Player(this.client, {
            ytdlOptions: {
                quality: 'highestaudio',
                highWaterMark: 1 << 25
            },
            metadataTransformer: (track) => {
                return {
                    title: track.title,
                    author: track.author,
                    thumbnail: track.thumbnail,
                    duration: track.duration,
                    requestedBy: track.requestedBy
                };
            }
        });

        // Register extractors for multiple sources
        const { YouTubeExtractor } = require('@discord-player/extractor');
        const { SoundCloudExtractor } = require('@discord-player/extractor');
        const { AppleMusicExtractor } = require('@discord-player/extractor');
        const { SpotifyExtractor } = require('@discord-player/extractor');

        this.player.registerExtractors(
            YouTubeExtractor,
            SoundCloudExtractor,
            AppleMusicExtractor,
            SpotifyExtractor
        );
    }

    async play(guildId, channel, query, user) {
        try {
            const queue = await this.player.play(channel, query, {
                nodeOptions: {
                    guildId,
                    metadata: {
                        channel,
                        user,
                        requestedAt: Date.now()
                    },
                    selfDeaf: true,
                    leaveOnEmpty: false, // 24/7 mode support
                    leaveOnEnd: true,
                    leaveOnStop: true
                }
            });

            return { success: true, queue };
        } catch (error) {
            console.error('Music play error:', error);
            return { success: false, error: error.message };
        }
    }

    async skip(guildId) {
        const queue = this.player.queues.get(guildId);
        if (!queue || !queue.currentTrack) {
            return { success: false, error: 'No hay música reproduciéndose' };
        }

        queue.node.skip();
        return { success: true, message: 'Canción saltada' };
    }

    async stop(guildId) {
        const queue = this.player.queues.get(guildId);
        if (!queue) {
            return { success: false, error: 'No hay cola de reproducción' };
        }

        queue.delete();
        return { success: true, message: 'Reproducción detenida' };
    }

    async pause(guildId) {
        const queue = this.player.queues.get(guildId);
        if (!queue || !queue.currentTrack) {
            return { success: false, error: 'No hay música reproduciéndose' };
        }

        queue.node.setPaused(true);
        return { success: true, message: 'Música pausada' };
    }

    async resume(guildId) {
        const queue = this.player.queues.get(guildId);
        if (!queue || !queue.currentTrack) {
            return { success: false, error: 'No hay música reproduciéndose' };
        }

        queue.node.setPaused(false);
        return { success: true, message: 'Música reanudada' };
    }

    async setVolume(guildId, volume) {
        const queue = this.player.queues.get(guildId);
        if (!queue) {
            return { success: false, error: 'No hay cola de reproducción' };
        }

        if (volume < 0 || volume > 200) {
            return { success: false, error: 'El volumen debe estar entre 0 y 200' };
        }

        queue.node.setVolume(volume);
        return { success: true, message: `Volumen establecido a ${volume}%` };
    }

    async setRepeatMode(guildId, mode) {
        const queue = this.player.queues.get(guildId);
        if (!queue) {
            return { success: false, error: 'No hay cola de reproducción' };
        }

        const repeatModes = {
            off: QueueRepeatMode.OFF,
            track: QueueRepeatMode.TRACK,
            queue: QueueRepeatMode.QUEUE
        };

        if (!repeatModes[mode]) {
            return { success: false, error: 'Modo de repetición inválido' };
        }

        queue.setRepeatMode(repeatModes[mode]);
        return { success: true, message: `Modo de repetición: ${mode}` };
    }

    async seek(guildId, position) {
        const queue = this.player.queues.get(guildId);
        if (!queue || !queue.currentTrack) {
            return { success: false, error: 'No hay música reproduciéndose' };
        }

        const trackDuration = queue.currentTrack.durationMS;
        if (position < 0 || position > trackDuration) {
            return { success: false, error: 'Posición inválida' };
        }

        await queue.node.seek(position);
        return { success: true, message: `Buscando en ${this.formatTime(position)}` };
    }

    async addFilter(guildId, filter) {
        const queue = this.player.queues.get(guildId);
        if (!queue) {
            return { success: false, error: 'No hay cola de reproducción' };
        }

        const availableFilters = [
            'bassboost', '8d', 'vaporwave', 'nightcore', 
            'phaser', 'tremolo', 'vibrato', 'reverse', 
            'treble', 'normalizer', 'surrounding', 'pulsator',
            'subboost', 'karaoke', 'flanger', 'mcompand',
            'earwax', 'echo', 'distortion', 'gate', 'haas',
            'invert', 'lowpass', 'highpass', 'fadein', 'fadeout'
        ];

        if (!availableFilters.includes(filter)) {
            return { success: false, error: `Filtro no disponible. Opciones: ${availableFilters.join(', ')}` };
        }

        const filters = queue.filters;
        filters.addFilter(filter);
        
        return { success: true, message: `Filtro ${filter} activado` };
    }

    async removeFilter(guildId, filter) {
        const queue = this.player.queues.get(guildId);
        if (!queue) {
            return { success: false, error: 'No hay cola de reproducción' };
        }

        const filters = queue.filters;
        filters.removeFilter(filter);
        
        return { success: true, message: `Filtro ${filter} desactivado` };
    }

    async clearFilters(guildId) {
        const queue = this.player.queues.get(guildId);
        if (!queue) {
            return { success: false, error: 'No hay cola de reproducción' };
        }

        const filters = queue.filters;
        filters.clearFilters();
        
        return { success: true, message: 'Todos los filtros removidos' };
    }

    getQueue(guildId) {
        return this.player.queues.get(guildId);
    }

    formatTime(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

        const formatted = [
            minutes.toString().padStart(2, '0'),
            seconds.toString().padStart(2, '0')
        ];

        if (hours > 0) {
            formatted.unshift(hours.toString().padStart(2, '0'));
        }

        return formatted.join(':');
    }

    createProgressBar(queue, length = 20) {
        if (!queue || !queue.currentTrack) return '';

        const current = queue.currentTrack.durationMS;
        const progress = queue.node.getTimestamp();
        const progressMs = this.parseTime(progress);
        
        const percent = Math.min(100, Math.max(0, (progressMs / current) * 100));
        const filled = Math.floor((percent / 100) * length);
        const empty = length - filled;

        const bar = '▓'.repeat(filled) + '░'.repeat(empty);
        return `[${bar}] ${this.formatTime(progressMs)} / ${this.formatTime(current)}`;
    }

    parseTime(timeStr) {
        if (!timeStr) return 0;
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 3) {
            return ((parts[0] * 60) + parts[1]) * 1000 + (parts[2] * 1000);
        } else if (parts.length === 2) {
            return (parts[0] * 60 + parts[1]) * 1000;
        }
        return 0;
    }
}

module.exports = MusicSystem;
