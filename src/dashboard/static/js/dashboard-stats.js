// Dashboard Stats Enhancement - Real-time statistics for Pogy Dashboard

class DashboardStats {
  constructor() {
    this.guildId = null;
    this.refreshInterval = null;
    this.charts = {};
  }

  async init(guildId) {
    this.guildId = guildId;
    await this.loadStats();
    this.startAutoRefresh();
  }

  async loadStats() {
    try {
      const response = await fetch(`/dashboard/${this.guildId}/stats`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      if (data.success) {
        this.updateStatsCards(data.data);
        this.updateLeaderboards(data.data);
        this.updateGuildInfo(data.data);
        this.renderCharts(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      this.showError();
    }
  }

  updateStatsCards(data) {
    // Update level stats card
    const totalLevels = data.levels.totalUsers;
    const topLevel = data.levels.topUsers[0]?.level || 0;
    
    document.getElementById('total-levels').textContent = totalLevels;
    document.getElementById('top-level').textContent = topLevel;

    // Update economy stats card
    const totalCoins = data.economy.totalCoins;
    const topBalance = data.economy.topUsers[0]?.balance || 0;
    
    document.getElementById('total-coins').textContent = this.formatNumber(totalCoins);
    document.getElementById('top-balance').textContent = this.formatNumber(topBalance);

    // Update guild stats card
    document.getElementById('member-count').textContent = this.formatNumber(data.guildInfo.memberCount);
    document.getElementById('online-count').textContent = this.formatNumber(data.guildInfo.onlineCount);
  }

  updateLeaderboards(data) {
    // Levels Leaderboard
    const levelsContainer = document.getElementById('levels-leaderboard');
    if (levelsContainer) {
      levelsContainer.innerHTML = data.levels.topUsers.map((user, index) => `
        <div class="leaderboard-item">
          <div class="leaderboard-rank rank-${index < 3 ? index + 1 : 'other'}">${index + 1}</div>
          <img src="https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar || 'default'}.png" 
               class="leaderboard-avatar" alt="${user.username}" 
               onerror="this.src='https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png'">
          <div class="leaderboard-info">
            <div class="leaderboard-username">${user.username}</div>
            <div class="leaderboard-stat">Level ${user.level} • ${user.xp.toLocaleString()} XP</div>
          </div>
          <div class="leaderboard-value">Lvl ${user.level}</div>
        </div>
      `).join('');
    }

    // Economy Leaderboard
    const economyContainer = document.getElementById('economy-leaderboard');
    if (economyContainer) {
      economyContainer.innerHTML = data.economy.topUsers.map((user, index) => `
        <div class="leaderboard-item">
          <div class="leaderboard-rank rank-${index < 3 ? index + 1 : 'other'}">${index + 1}</div>
          <img src="https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar || 'default'}.png" 
               class="leaderboard-avatar" alt="${user.username}"
               onerror="this.src='https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png'">
          <div class="leaderboard-info">
            <div class="leaderboard-username">${user.username}</div>
            <div class="leaderboard-stat">Bank: ${user.bank.toLocaleString()}</div>
          </div>
          <div class="leaderboard-value">${user.balance.toLocaleString()} 🪙</div>
        </div>
      `).join('');
    }
  }

  updateGuildInfo(data) {
    document.getElementById('guild-members').textContent = this.formatNumber(data.guildInfo.memberCount);
    document.getElementById('guild-channels').textContent = this.formatNumber(data.guildInfo.channelCount);
    document.getElementById('guild-roles').textContent = this.formatNumber(data.guildInfo.roleCount);
    document.getElementById('guild-online').textContent = this.formatNumber(data.guildInfo.onlineCount);
  }

  renderCharts(data) {
    // Level Distribution Chart
    const levelCtx = document.getElementById('levelChart');
    if (levelCtx && !this.charts.level) {
      const levels = data.levels.topUsers.map(u => u.level);
      this.charts.level = new Chart(levelCtx, {
        type: 'doughnut',
        data: {
          labels: data.levels.topUsers.map(u => u.username),
          datasets: [{
            data: levels,
            backgroundColor: [
              '#667eea', '#764ba2', '#f093fb', '#f5576c',
              '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
              '#fa709a', '#fee140'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }

    // Economy Distribution Chart
    const economyCtx = document.getElementById('economyChart');
    if (economyCtx && !this.charts.economy) {
      const balances = data.economy.topUsers.map(u => u.balance);
      this.charts.economy = new Chart(economyCtx, {
        type: 'bar',
        data: {
          labels: data.economy.topUsers.map(u => u.username),
          datasets: [{
            label: 'Balance',
            data: balances,
            backgroundColor: '#43e97b',
            borderRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }
  }

  startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      this.loadStats();
    }, 30000); // Refresh every 30 seconds
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  showError() {
    // Show error message to user
    const container = document.querySelector('.stats-container');
    if (container) {
      container.innerHTML = `
        <div class="loading-stats">
          <p style="color: #f5576c;">Failed to load statistics. Please refresh the page.</p>
        </div>
      `;
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const guildIdElement = document.getElementById('guild-id');
  if (guildIdElement && guildIdElement.dataset.guildId) {
    const stats = new DashboardStats();
    stats.init(guildIdElement.dataset.guildId);
    
    // Store in global scope for cleanup
    window.dashboardStats = stats;
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.dashboardStats) {
    window.dashboardStats.stopAutoRefresh();
  }
});
