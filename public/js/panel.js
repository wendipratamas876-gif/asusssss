// SIMPLE PANEL.JS - FIXED VERSION
class Panel {
    constructor() {
        this.currentPage = 'dashboard';
        this.init();
    }
    
    async init() {
        this.checkAuth();
        this.setupEventListeners();
        await this.loadPage('dashboard');
        this.startClock();
    }
    
    checkAuth() {
        // Check if user is logged in
        const user = this.getUser();
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        // Update sidebar info
        document.getElementById('usernameDisplay').textContent = user.username || 'Admin';
        document.getElementById('userRole').textContent = (user.role || 'Owner').charAt(0).toUpperCase() + (user.role || 'Owner').slice(1);
        document.getElementById('userPlan').textContent = (user.plan || 'Ultimate').toUpperCase();
        
        // Show admin menu if owner
        if (user.role === 'owner') {
            document.getElementById('adminMenu').style.display = 'block';
        }
    }
    
    getUser() {
        const userStr = localStorage.getItem('user');
        try {
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            return null;
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
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                }
            });
        }
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-theme');
                const icon = themeToggle.querySelector('i');
                if (document.body.classList.contains('dark-theme')) {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                } else {
                    icon.classList.remove('fa-sun');
                    icon.classList.add('fa-moon');
                }
            });
        }
        
        // Notifications
        const notificationsBtn = document.getElementById('notificationsBtn');
        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', () => {
                this.showNotification('No new notifications', 'info');
            });
        }
    }
    
    async loadPage(page) {
        this.currentPage = page;
        const contentArea = document.getElementById('contentArea');
        
        // Show loading
        contentArea.innerHTML = '<div class="loading-screen"><div class="loader"></div><p>Loading...</p></div>';
        
        try {
            let html = '';
            
            switch(page) {
                case 'dashboard':
                    html = await this.loadDashboard();
                    break;
                case 'attacks':
                    html = await this.loadAttacks();
                    break;
                case 'vps':
                    html = await this.loadVPS();
                    break;
                case 'users':
                    html = await this.loadUsers();
                    break;
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
        // Try to fetch data, fallback to mock data if fails
        let data = {};
        try {
            const response = await fetch('/api/dashboard');
            if (response.ok) {
                data = await response.json();
            } else {
                throw new Error('API returned ' + response.status);
            }
        } catch (error) {
            console.log('Using mock data for dashboard:', error.message);
            data = this.getMockDashboardData();
        }
        
        const user = this.getUser();
        
        return `
            <div class="dashboard">
                <div class="page-header">
                    <h1><i class="fas fa-tachometer-alt"></i> Dashboard</h1>
                    <p>Welcome back, ${user?.username || 'Admin'}. Here's your system overview.</p>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card primary">
                        <div class="stat-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${data.stats?.totalUsers || 1}</h3>
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
                            <h3>${data.stats?.activeVPS || 0}/${data.stats?.totalVPS || 0}</h3>
                            <p>VPS Online</p>
                        </div>
                        <div class="stat-trend">
                            <i class="fas fa-plug"></i> ${data.stats?.cncStatus || 'active'}
                        </div>
                    </div>
                    
                    <div class="stat-card warning">
                        <div class="stat-icon">
                            <i class="fas fa-bolt"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${data.stats?.ongoingAttacks || 0}</h3>
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
                            <h3>${data.stats?.totalMethods || 20}</h3>
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
                                <form id="quickAttackForm" onsubmit="event.preventDefault(); window.panel.launchQuickAttack();">
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label><i class="fas fa-globe"></i> Target IP</label>
                                            <input type="text" id="targetIp" placeholder="e.g., 192.168.1.1" required>
                                        </div>
                                        <div class="form-group">
                                            <label><i class="fas fa-door-open"></i> Port</label>
                                            <input type="number" id="targetPort" value="80" required>
                                        </div>
                                    </div>
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label><i class="fas fa-clock"></i> Duration (seconds)</label>
                                            <input type="number" id="attackDuration" value="60" min="1" max="3600">
                                        </div>
                                        <div class="form-group">
                                            <label><i class="fas fa-tools"></i> Method</label>
                                            <select id="attackMethod" required>
                                                <option value="syn-pps">SYN Flood (PPS)</option>
                                                <option value="syn-gbps">SYN Flood (GBPS)</option>
                                                <option value="ack-pps">ACK Flood (PPS)</option>
                                                <option value="ack-gbps">ACK Flood (GBPS)</option>
                                                <option value="icmp-pps">ICMP Flood (PPS)</option>
                                                <option value="icmp-gbps">ICMP Flood (GBPS)</option>
                                            </select>
                                        </div>
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
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>12:30:45</td>
                                                <td>192.168.1.1:80</td>
                                                <td><span class="method-tag">SYN-PPS</span></td>
                                                <td><span class="status-badge running">RUNNING</span></td>
                                            </tr>
                                            <tr>
                                                <td>11:15:22</td>
                                                <td>example.com:443</td>
                                                <td><span class="method-tag">ACK-GBPS</span></td>
                                                <td><span class="status-badge completed">COMPLETED</span></td>
                                            </tr>
                                            <tr>
                                                <td>10:05:18</td>
                                                <td>203.0.113.5:22</td>
                                                <td><span class="method-tag">ICMP-PPS</span></td>
                                                <td><span class="status-badge stopped">STOPPED</span></td>
                                            </tr>
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
                                        <span class="value">1d 4h 30m</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="label">CNC Status:</span>
                                        <span class="value online">ONLINE</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="label">Memory:</span>
                                        <span class="value">78%</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="label">CPU Load:</span>
                                        <span class="value">45%</span>
                                    </div>
                                </div>
                                
                                <div class="cnc-control">
                                    <button class="btn btn-start" onclick="window.panel.startCNC()">
                                        <i class="fas fa-power-off"></i> Start CNC
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
                                            <div class="limit-fill" style="width: 20%"></div>
                                        </div>
                                        <div class="limit-info">
                                            <span>Concurrent Attacks:</span>
                                            <span>1/10</span>
                                        </div>
                                    </div>
                                    <div class="limit-item">
                                        <div class="limit-bar">
                                            <div class="limit-fill" style="width: 40%"></div>
                                        </div>
                                        <div class="limit-info">
                                            <span>Max Duration:</span>
                                            <span>3600s</span>
                                        </div>
                                    </div>
                                    <div class="limit-item">
                                        <div class="limit-info">
                                            <span>Plan:</span>
                                            <span class="plan-badge ultimate">ULTIMATE</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    getMockDashboardData() {
        return {
            stats: {
                totalUsers: 1,
                activeVPS: 2,
                totalVPS: 3,
                ongoingAttacks: 1,
                cncStatus: 'active',
                systemUptime: 86400,
                totalMethods: 20
            },
            user: {
                ongoing: 1,
                maxConcurrent: 10,
                maxDuration: 3600,
                plan: 'ultimate'
            }
        };
    }
    
    async launchQuickAttack() {
        const target = document.getElementById('targetIp').value;
        const port = document.getElementById('targetPort').value;
        const duration = document.getElementById('attackDuration').value;
        const method = document.getElementById('attackMethod').value;
        
        if (!target) {
            this.showNotification('Please enter a target', 'error');
            return;
        }
        
        try {
            this.showNotification('Launching attack...', 'info');
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.showNotification(`Attack launched on ${target}:${port}`, 'success');
            
        } catch (error) {
            this.showNotification('Failed to launch attack: ' + error.message, 'error');
        }
    }
    
    attachPageEvents(page) {
        // Add page-specific event listeners here
        if (page === 'dashboard') {
            // Update quick stats
            this.updateQuickStats();
        }
    }
    
    updateQuickStats() {
        // Update the quick stats in top bar
        document.getElementById('quickAttacks').textContent = '1';
        document.getElementById('quickVPS').textContent = '2';
        document.getElementById('ongoingBadge').textContent = '1';
        document.getElementById('vpsBadge').textContent = '2';
        
        // Update CNC status
        const cncStatus = document.getElementById('cncStatus');
        if (cncStatus) {
            cncStatus.textContent = 'ONLINE';
            cncStatus.className = 'status-value online';
        }
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
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        if (!container) return;
        
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
    
    // Placeholder methods for other pages
    async loadAttacks() {
        return `<div class="attacks-page"><h1>Attack Hub</h1><p>Attack management coming soon...</p></div>`;
    }
    
    async loadVPS() {
        return `<div class="vps-page"><h1>VPS Management</h1><p>VPS management coming soon...</p></div>`;
    }
    
    async loadUsers() {
        return `<div class="users-page"><h1>User Management</h1><p>User management coming soon...</p></div>`;
    }
    
    async loadLogs() {
        return `<div class="logs-page"><h1>Attack History</h1><p>Logs coming soon...</p></div>`;
    }
    
    async loadTools() {
        return `<div class="tools-page"><h1>Tools</h1><p>Tools coming soon...</p></div>`;
    }
    
    async loadSettings() {
        return `<div class="settings-page"><h1>Settings</h1><p>Settings coming soon...</p></div>`;
    }
    
    // Placeholder for other functions
    stopAllAttacks() {
        this.showNotification('All attacks stopped', 'success');
    }
    
    startCNC() {
        this.showNotification('CNC started', 'success');
        this.updateQuickStats();
    }
    
    checkAllVPS() {
        this.showNotification('Checking all VPS...', 'info');
    }
    
    showAttackModal() {
        this.showNotification('Attack modal would open here', 'info');
    }
}

// Initialize panel when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.panel = new Panel();
});
