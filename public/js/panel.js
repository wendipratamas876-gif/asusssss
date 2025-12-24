class Panel {
    constructor() {
        this.apiUrl = '/api';
        this.currentPage = 'dashboard';
        this.init();
    }
    
    async init() {
        this.checkAuth();
        this.setupEventListeners();
        await this.loadPage('dashboard');
        this.updateLiveStats();
        this.startClock();
        
        // Check CNC status
        this.checkCNCStatus();
    }
    
    checkAuth() {
        if (!Auth.isAuthenticated()) {
            window.location.href = 'index.html';
            return;
        }
        
        const user = Auth.getUser();
        if (user) {
            document.getElementById('usernameDisplay').textContent = user.username;
            document.getElementById('userRole').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
            document.getElementById('userPlan').textContent = user.plan.toUpperCase();
            
            if (user.role === 'owner') {
                const adminMenu = document.getElementById('adminMenu');
                if (adminMenu) adminMenu.style.display = 'block';
            }
        }
    }
    
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.closest('a').dataset.page;
                if (page) {
                    this.loadPage(page);
                    
                    // Update active state
                    document.querySelectorAll('.nav-menu li').forEach(li => {
                        li.classList.remove('active');
                    });
                    e.target.closest('li').classList.add('active');
                }
            });
        });
        
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to logout?')) {
                    Auth.logout();
                }
            });
        }
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        // Notifications
        const notificationsBtn = document.getElementById('notificationsBtn');
        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', () => {
                this.showNotifications();
            });
        }
    }
    
    async loadPage(page) {
        this.currentPage = page;
        const contentArea = document.getElementById('contentArea');
        if (!contentArea) return;
        
        contentArea.innerHTML = '<div class="loading-screen"><div class="loader"></div><p>Loading...</p></div>';
        
        try {
            let html = '';
            
            switch(page) {
                case 'dashboard':
                    html = await this.loadDashboard();
                    break;
                case 'attacks':
                    window.location.href = 'attacks.html';
                    return;
                case 'vps':
                    window.location.href = 'vps.html';
                    return;
                case 'users':
                    window.location.href = 'users.html';
                    return;
                case 'logs':
                    html = await this.loadLogs();
                    break;
                case 'tools':
                    html = await this.loadTools();
                    break;
                case 'settings':
                    html = await this.loadSettings();
                    break;
                default:
                    html = await this.loadDashboard();
            }
            
            contentArea.innerHTML = html;
            this.attachPageEvents(page);
            
        } catch (error) {
            console.error('Error loading page:', error);
            contentArea.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Error loading page</h3>
                    <p>${error.message}</p>
                    <button class="btn-retry" onclick="window.panel.loadPage('${page}')">
                        Retry
                    </button>
                </div>
            `;
        }
    }
    
    async loadDashboard() {
        try {
            const data = await Auth.makeRequest('/dashboard');
            const user = Auth.getUser();
            
            return `
                <div class="dashboard">
                    <div class="page-header">
                        <h1><i class="fas fa-tachometer-alt"></i> Dashboard</h1>
                        <p>Welcome back, ${user?.username || 'User'}. Here's your system overview.</p>
                    </div>
                    
                    <div class="stats-grid">
                        <div class="stat-card primary">
                            <div class="stat-icon">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${data.stats.totalUsers}</h3>
                                <p>Total Users</p>
                            </div>
                            <div class="stat-trend">
                                <i class="fas fa-arrow-up"></i> 12%
                            </div>
                        </div>
                        
                        <div class="stat-card success">
                            <div class="stat-icon">
                                <i class="fas fa-server"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${data.stats.activeVPS}/${data.stats.totalVPS}</h3>
                                <p>VPS Online</p>
                            </div>
                            <div class="stat-trend">
                                <i class="fas fa-plug"></i> ${data.stats.cncStatus === 'active' ? 'ONLINE' : 'OFFLINE'}
                            </div>
                        </div>
                        
                        <div class="stat-card warning">
                            <div class="stat-icon">
                                <i class="fas fa-bolt"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${data.stats.ongoingAttacks}</h3>
                                <p>Ongoing Attacks</p>
                            </div>
                            <div class="stat-trend">
                                <button class="btn-stop-all" onclick="window.panel.stopAllAttacks()">
                                    <i class="fas fa-stop"></i> Stop All
                                </button>
                            </div>
                        </div>
                        
                        <div class="stat-card danger">
                            <div class="stat-icon">
                                <i class="fas fa-shield-alt"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${data.stats.totalMethods}</h3>
                                <p>Available Methods</p>
                            </div>
                            <div class="stat-trend">
                                <i class="fas fa-lock"></i> Pro
                            </div>
                        </div>
                    </div>
                    
                    <div class="dashboard-content">
                        <div class="col-8">
                            <div class="card">
                                <div class="card-header">
                                    <h3><i class="fas fa-bolt"></i> Quick Attack</h3>
                                    <button class="btn-new" onclick="window.panel.showAttackModal()">
                                        <i class="fas fa-plus"></i> New Attack
                                    </button>
                                </div>
                                <div class="card-body">
                                    <form id="quickAttackForm">
                                        <div class="form-group">
                                            <label><i class="fas fa-globe"></i> Target IP or Domain</label>
                                            <input type="text" id="targetInput" placeholder="e.g., 192.168.1.1 or example.com" required>
                                        </div>
                                        
                                        <div class="form-row">
                                            <div class="form-group">
                                                <label><i class="fas fa-door-open"></i> Port</label>
                                                <input type="number" id="portInput" value="80" required>
                                            </div>
                                            <div class="form-group">
                                                <label><i class="fas fa-clock"></i> Duration (seconds)</label>
                                                <input type="number" id="durationInput" value="60" min="1" max="3600">
                                            </div>
                                        </div>
                                        
                                        <div class="form-group">
                                            <label><i class="fas fa-tools"></i> Method</label>
                                            <select id="methodSelect" required>
                                                <option value="syn-pps">SYN Flood (High PPS)</option>
                                                <option value="syn-gbps">SYN Flood (High Bandwidth)</option>
                                                <option value="ack-pps">ACK Flood (High PPS)</option>
                                                <option value="ack-gbps">ACK Flood (High Bandwidth)</option>
                                                <option value="icmp-pps">ICMP Flood (High PPS)</option>
                                                <option value="icmp-gbps">ICMP Flood (High Bandwidth)</option>
                                            </select>
                                        </div>
                                        <button type="submit" class="btn-attack">
                                            <i class="fas fa-rocket"></i> Launch Attack
                                        </button>
                                    </form>
                                </div>
                            </div>
                            
                            <div class="card">
                                <div class="card-header">
                                    <h3><i class="fas fa-history"></i> Recent Attacks</h3>
                                </div>
                                <div class="card-body">
                                    <div class="table-container">
                                        <table class="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Time</th>
                                                    <th>Target</th>
                                                    <th>Method</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${data.recentAttacks.map(attack => `
                                                    <tr>
                                                        <td>${new Date(attack.startTime).toLocaleTimeString()}</td>
                                                        <td>${attack.target}</td>
                                                        <td><span class="method-tag">${attack.method}</span></td>
                                                        <td><span class="status-badge ${attack.status}">${attack.status}</span></td>
                                                        <td>
                                                            <button class="btn-icon" onclick="window.panel.copyAttackCommand('${attack.command}')" title="Copy Command">
                                                                <i class="fas fa-copy"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-4">
                            <div class="card">
                                <div class="card-header">
                                    <h3><i class="fas fa-chart-line"></i> System Status</h3>
                                </div>
                                <div class="card-body">
                                    <div class="system-info">
                                        <div class="info-item">
                                            <span class="label">Uptime:</span>
                                            <span class="value">${this.formatUptime(data.stats.systemUptime)}</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">CNC Status:</span>
                                            <span class="value ${data.stats.cncStatus === 'active' ? 'online' : 'offline'}">
                                                ${data.stats.cncStatus === 'active' ? 'ONLINE' : 'OFFLINE'}
                                            </span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">Memory:</span>
                                            <span class="value">${Math.floor(Math.random() * 30) + 70}%</span>
                                        </div>
                                        <div class="info-item">
                                            <span class="label">CPU Load:</span>
                                            <span class="value">${Math.floor(Math.random() * 40) + 20}%</span>
                                        </div>
                                    </div>
                                    
                                    <div class="cnc-control">
                                        <button class="btn ${data.stats.cncStatus === 'active' ? 'btn-stop' : 'btn-start'}" 
                                                onclick="window.panel.toggleCNC()">
                                            <i class="fas fa-power-off"></i>
                                            ${data.stats.cncStatus === 'active' ? 'Stop CNC' : 'Start CNC'}
                                        </button>
                                        <button class="btn btn-secondary" onclick="window.panel.checkAllVPS()">
                                            <i class="fas fa-sync-alt"></i> Check VPS
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="card">
                                <div class="card-header">
                                    <h3><i class="fas fa-user-shield"></i> User Limits</h3>
                                </div>
                                <div class="card-body">
                                    <div class="user-limits">
                                        <div class="limit-item">
                                            <div class="limit-bar">
                                                <div class="limit-fill" style="width: ${(data.user.ongoing || 0) / data.user.maxConcurrent * 100}%"></div>
                                            </div>
                                            <div class="limit-info">
                                                <span>Concurrent Attacks:</span>
                                                <span>${data.user.ongoing || 0}/${data.user.maxConcurrent}</span>
                                            </div>
                                        </div>
                                        <div class="limit-item">
                                            <div class="limit-bar">
                                                <div class="limit-fill" style="width: ${(data.user.ongoing || 0) / data.user.maxConcurrent * 100}%"></div>
                                            </div>
                                            <div class="limit-info">
                                                <span>Max Duration:</span>
                                                <span>${data.user.maxDuration}s</span>
                                            </div>
                                        </div>
                                        <div class="limit-item">
                                            <div class="limit-info">
                                                <span>Plan:</span>
                                                <span class="plan-badge ${data.user.plan}">${data.user.plan.toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading dashboard:', error);
            return `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Error loading dashboard</h3>
                    <p>${error.message}</p>
                    <button class="btn-retry" onclick="window.panel.loadPage('dashboard')">
                        Retry
                    </button>
                </div>
            `;
        }
    }
    
    attachPageEvents(page) {
        if (page === 'dashboard') {
            this.attachDashboardEvents();
        }
    }
    
    attachDashboardEvents() {
        // Quick attack form
        const quickForm = document.getElementById('quickAttackForm');
        if (quickForm) {
            quickForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.launchQuickAttack();
            });
        }
    }
    
    async launchQuickAttack() {
        const target = document.getElementById('targetInput')?.value;
        const port = document.getElementById('portInput')?.value;
        const duration = document.getElementById('durationInput')?.value;
        const method = document.getElementById('methodSelect')?.value;
        
        if (!target || !port || !duration || !method) {
            this.showNotification('Please fill all fields', 'error');
            return;
        }
        
        try {
            const response = await Auth.makeRequest('/attack', {
                method: 'POST',
                body: JSON.stringify({ target, port, method, duration })
            });
            
            this.showNotification('Attack launched successfully!', 'success');
            this.loadPage('dashboard'); // Reload dashboard
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
    
    async stopAllAttacks() {
        if (!confirm('Stop ALL ongoing attacks?')) return;
        
        try {
            await Auth.makeRequest('/attack/stop-all', { method: 'POST' });
            this.showNotification('All attacks stopped', 'success');
            this.loadPage('dashboard');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
    
    async toggleCNC() {
        try {
            const status = await Auth.makeRequest('/cnc/status');
            
            if (status.active) {
                await Auth.makeRequest('/cnc/stop', { method: 'POST' });
                this.showNotification('CNC stopped', 'warning');
            } else {
                await Auth.makeRequest('/cnc/start', { method: 'POST' });
                this.showNotification('CNC started', 'success');
            }
            
            setTimeout(() => this.loadPage(this.currentPage), 1000);
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
    
    async checkAllVPS() {
        try {
            this.showNotification('Checking VPS status...', 'info');
            await Auth.makeRequest('/vps/check-all', { method: 'POST' });
            this.showNotification('VPS status updated', 'success');
            this.loadPage('dashboard');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
    
    async checkCNCStatus() {
        try {
            const status = await Auth.makeRequest('/cnc/status');
            const cncStatus = document.getElementById('cncStatus');
            if (cncStatus) {
                cncStatus.textContent = status.active ? 'ONLINE' : 'OFFLINE';
                cncStatus.className = `status-value ${status.active ? 'online' : 'offline'}`;
            }
        } catch (error) {
            console.error('Failed to check CNC status:', error);
        }
    }
    
    updateLiveStats() {
        setInterval(async () => {
            try {
                const data = await Auth.makeRequest('/dashboard');
                
                // Update quick stats
                const quickAttacks = document.getElementById('quickAttacks');
                const quickVPS = document.getElementById('quickVPS');
                const ongoingBadge = document.getElementById('ongoingBadge');
                const vpsBadge = document.getElementById('vpsBadge');
                
                if (quickAttacks) quickAttacks.textContent = data.stats.ongoingAttacks;
                if (quickVPS) quickVPS.textContent = data.stats.activeVPS;
                if (ongoingBadge) ongoingBadge.textContent = data.stats.ongoingAttacks;
                if (vpsBadge) vpsBadge.textContent = data.stats.activeVPS;
                
                // Update CNC status
                this.checkCNCStatus();
            } catch (error) {
                console.error('Failed to update stats:', error);
            }
        }, 10000);
    }
    
    startClock() {
        function updateClock() {
            const now = new Date();
            const timeStr = now.toLocaleTimeString();
            const dateStr = now.toLocaleDateString();
            
            const currentTime = document.getElementById('currentTime');
            const systemTime = document.getElementById('systemTime');
            
            if (currentTime) currentTime.textContent = timeStr;
            if (systemTime) systemTime.textContent = `${dateStr} ${timeStr}`;
        }
        
        updateClock();
        setInterval(updateClock, 1000);
    }
    
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        return `${days}d ${hours}h ${minutes}m`;
    }
    
    copyAttackCommand(command) {
        navigator.clipboard.writeText(command).then(() => {
            this.showNotification('Command copied to clipboard!', 'success');
        });
    }
    
    showAttackModal() {
        this.showNotification('Attack modal coming soon', 'info');
    }
    
    showNotifications() {
        this.showNotification('No new notifications', 'info');
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        if (!container) {
            console.log(`${type.toUpperCase()}: ${message}`);
            return;
        }
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="close-notification">&times;</button>
        `;
        
        container.appendChild(notification);
        
        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
        
        // Close button
        notification.querySelector('.close-notification').addEventListener('click', () => {
            notification.remove();
        });
    }
    
    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            if (document.body.classList.contains('dark-theme')) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        }
    }
}

// Initialize panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.panel = new Panel();
});
