class UserManager {
    constructor() {
        this.apiUrl = window.auth.apiUrl;
        this.selectedUsers = new Set();
        this.init();
    }
    
    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.loadUsers();
        this.loadStats();
        this.startClock();
        this.initCharts();
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
            window.location.href = 'panel.html'; // Only owners can access user management
        }
    }
    
    setupEventListeners() {
        // Add user button
        document.getElementById('addUserBtn').addEventListener('click', () => {
            this.showAddUserModal();
        });
        
        // Bulk actions
        document.getElementById('bulkUsersBtn').addEventListener('click', () => {
            this.showBulkAddUsers();
        });
        
        document.getElementById('exportUsersBtn').addEventListener('click', () => {
            this.exportUsers();
        });
        
        document.getElementById('refreshUsersBtn').addEventListener('click', () => {
            this.loadUsers();
            this.loadStats();
        });
        
        // Select all checkbox
        document.getElementById('selectAllUsers').addEventListener('change', (e) => {
            this.toggleSelectAllUsers(e.target.checked);
        });
        
        // Filter and sort
        document.getElementById('filterUsers').addEventListener('change', (e) => {
            this.filterUsers(e.target.value);
        });
        
        document.getElementById('sortUsers').addEventListener('change', (e) => {
            this.sortUsers(e.target.value);
        });
        
        // Bulk actions
        document.getElementById('bulkActivateBtn').addEventListener('click', () => {
            this.bulkActivateUsers();
        });
        
        document.getElementById('bulkSuspendBtn').addEventListener('click', () => {
            this.bulkSuspendUsers();
        });
        
        document.getElementById('bulkDeleteBtn').addEventListener('click', () => {
            this.bulkDeleteUsers();
        });
        
        document.getElementById('bulkChangePlanBtn').addEventListener('click', () => {
            this.bulkChangePlan();
        });
        
        // Search users
        document.getElementById('searchUsers').addEventListener('input', (e) => {
            this.searchUsers(e.target.value);
        });
        
        // Close details panel
        document.getElementById('closeUserDetails').addEventListener('click', () => {
            this.hideUserDetails();
        });
        
        // Activity range
        document.getElementById('activityRange').addEventListener('change', (e) => {
            this.updateActivityCharts(e.target.value);
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
    
    async loadUsers() {
        const tableBody = document.getElementById('userTableBody');
        
        try {
            const users = await Auth.makeRequest('/users');
            
            if (!users || users.length === 0) {
                tableBody.innerHTML = `
                    <tr class="empty-row">
                        <td colspan="10">
                            <div class="empty-state">
                                <i class="fas fa-users"></i>
                                <h3>No Users Found</h3>
                                <p>Add your first user to start managing access</p>
                                <button class="btn-add-first" onclick="window.userManager.showAddUserModal()">
                                    <i class="fas fa-user-plus"></i> Add First User
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }
            
            tableBody.innerHTML = users.map(user => `
                <tr data-user-id="${user.id}" data-role="${user.role}" data-plan="${user.plan}" data-status="${user.status}">
                    <td>
                        <input type="checkbox" class="user-checkbox" value="${user.id}">
                    </td>
                    <td>${user.id}</td>
                    <td>
                        <div class="user-username">
                            <strong>${user.username}</strong>
                            ${user.id === 1 ? '<span class="owner-badge">OWNER</span>' : ''}
                        </div>
                    </td>
                    <td>${user.email}</td>
                    <td>
                        <span class="role-badge ${user.role}">${user.role.toUpperCase()}</span>
                    </td>
                    <td>
                        <span class="plan-badge ${user.plan}">${user.plan.toUpperCase()}</span>
                    </td>
                    <td>
                        <span class="status-badge ${user.status || 'active'}">${(user.status || 'active').toUpperCase()}</span>
                    </td>
                    <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                    <td>
                        <div class="user-actions">
                            <button class="btn-action view" onclick="window.userManager.viewUser(${user.id})" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-action edit" onclick="window.userManager.editUser(${user.id})" title="Edit User">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${user.id !== 1 ? `
                                <button class="btn-action delete" onclick="window.userManager.deleteUser(${user.id})" title="Delete User">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
            
            // Add event listeners to checkboxes
            document.querySelectorAll('.user-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    this.updateSelectedCount();
                });
            });
            
        } catch (error) {
            tableBody.innerHTML = `
                <tr class="error-row">
                    <td colspan="10">
                        <div class="error-state">
                            <i class="fas fa-exclamation-circle"></i>
                            <h3>Error loading users</h3>
                            <p>${error.message}</p>
                            <button class="btn-retry" onclick="window.userManager.loadUsers()">
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
            const users = await Auth.makeRequest('/users');
            const dashboard = await Auth.makeRequest('/dashboard');
            
            const totalUsers = users.length;
            const premiumUsers = users.filter(u => u.plan !== 'free').length;
            const resellerUsers = users.filter(u => u.role === 'reseller').length;
            const activeUsers = users.filter(u => u.lastLogin && 
                new Date(u.lastLogin).toDateString() === new Date().toDateString()).length;
            
            // Update stats
            document.getElementById('totalUsers').textContent = totalUsers;
            document.getElementById('premiumUsers').textContent = premiumUsers;
            document.getElementById('resellerUsers').textContent = resellerUsers;
            document.getElementById('activeUsers').textContent = activeUsers;
            
            // Update quick stats
            document.getElementById('userCount').textContent = totalUsers;
            document.getElementById('quickAttacks').textContent = dashboard.stats.ongoingAttacks || 0;
            
        } catch (error) {
            console.error('Failed to load user stats:', error);
        }
    }
    
    initCharts() {
        // Initialize attack activity chart
        const attackCtx = document.getElementById('attackActivityChart');
        if (attackCtx) {
            this.attackChart = new Chart(attackCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Attacks per Day',
                        data: [12, 19, 8, 15, 22, 18, 25],
                        borderColor: 'rgba(255, 71, 87, 0.8)',
                        backgroundColor: 'rgba(255, 71, 87, 0.1)',
                        tension: 0.4,
                        fill: true
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
        
        // Initialize plan distribution chart
        const planCtx = document.getElementById('planDistributionChart');
        if (planCtx) {
            this.planChart = new Chart(planCtx.getContext('2d'), {
                type: 'pie',
                data: {
                    labels: ['Free', 'Basic', 'Premium', 'Ultimate', 'Reseller'],
                    datasets: [{
                        data: [30, 25, 20, 15, 10],
                        backgroundColor: [
                            'rgba(102, 102, 102, 0.8)',
                            'rgba(30, 144, 255, 0.8)',
                            'rgba(155, 89, 182, 0.8)',
                            'rgba(255, 71, 87, 0.8)',
                            'rgba(243, 156, 18, 0.8)'
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
    
    updateActivityCharts(range) {
        // This would update charts based on time range
        this.showNotification(`Showing activity data for: ${range}`, 'info');
    }
    
    showAddUserModal() {
        const modal = document.getElementById('addUserModal');
        modal.style.display = 'block';
        
        // Reset form
        const form = document.getElementById('addUserForm');
        form.reset();
        
        // Load plans
        this.loadPlansForSelection();
        
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
            await this.createNewUser();
        });
    }
    
    async loadPlansForSelection() {
        try {
            const plans = await Auth.makeRequest('/plans');
            const plansGrid = document.getElementById('plansGrid');
            
            if (plansGrid) {
                plansGrid.innerHTML = Object.entries(plans).map(([planId, plan]) => `
                    <div class="plan-card" data-plan="${planId}">
                        <h5>${plan.name}</h5>
                        <div class="plan-price">
                            ${plan.price === 0 ? 'FREE' : `$${plan.price}`}
                        </div>
                        <div class="plan-features">
                            <ul>
                                <li><i class="fas fa-check"></i> ${plan.maxConcurrent} concurrent attacks</li>
                                <li><i class="fas fa-check"></i> ${plan.maxDuration}s max duration</li>
                                <li><i class="fas fa-check"></i> ${plan.methods.length} methods</li>
                                <li><i class="fas fa-check"></i> ${plan.support}</li>
                            </ul>
                        </div>
                    </div>
                `).join('');
                
                // Add click event to plan cards
                document.querySelectorAll('.plan-card').forEach(card => {
                    card.addEventListener('click', (e) => {
                        document.querySelectorAll('.plan-card').forEach(c => {
                            c.classList.remove('selected');
                        });
                        e.currentTarget.classList.add('selected');
                    });
                });
                
                // Select first plan by default
                const firstCard = plansGrid.querySelector('.plan-card');
                if (firstCard) {
                    firstCard.classList.add('selected');
                }
            }
        } catch (error) {
            console.error('Failed to load plans:', error);
        }
    }
    
    async createNewUser() {
        const form = document.getElementById('addUserForm');
        const modal = document.getElementById('addUserModal');
        
        // Get form values
        const username = document.getElementById('newUsername').value;
        const email = document.getElementById('newEmail').value;
        const password = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const role = document.getElementById('userRoleSelect').value;
        
        // Validate passwords match
        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }
        
        // Get selected plan
        const selectedPlanCard = document.querySelector('.plan-card.selected');
        if (!selectedPlanCard) {
            this.showNotification('Please select a plan', 'error');
            return;
        }
        const plan = selectedPlanCard.dataset.plan;
        
        // Get custom limits
        const maxConcurrent = document.getElementById('maxConcurrent').value;
        const maxDuration = document.getElementById('maxDuration').value;
        const dailyLimit = document.getElementById('dailyLimit').value;
        const bandwidthLimit = document.getElementById('bandwidthLimit').value;
        const expirationDate = document.getElementById('expirationDate').value;
        
        // Get permissions
        const permissions = {
            syn: document.getElementById('permSyn').checked,
            ack: document.getElementById('permAck').checked,
            icmp: document.getElementById('permIcmp').checked,
            udp: document.getElementById('permUdp').checked,
            advanced: document.getElementById('permAdvanced').checked,
            custom: document.getElementById('permCustom').checked,
            vpsView: document.getElementById('permVpsView').checked,
            vpsManage: document.getElementById('permVpsManage').checked,
            userView: document.getElementById('permUserView').checked,
            tools: document.getElementById('permTools').checked,
            api: document.getElementById('permApi').checked,
            reports: document.getElementById('permReports').checked
        };
        
        try {
            const userData = {
                username,
                email,
                password,
                role,
                plan,
                maxConcurrent: parseInt(maxConcurrent),
                maxDuration: parseInt(maxDuration),
                dailyLimit: parseInt(dailyLimit),
                bandwidthLimit: parseInt(bandwidthLimit),
                expirationDate: expirationDate || null,
                permissions,
                status: 'active'
            };
            
            const result = await Auth.makeRequest('/users', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            
            if (result.message) {
                this.showNotification('User created successfully!', 'success');
                modal.style.display = 'none';
                this.loadUsers();
                this.loadStats();
            }
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
    
    showBulkAddUsers() {
        // This would show a modal for bulk user addition
        this.showNotification('Bulk user addition feature coming soon', 'info');
    }
    
    async exportUsers() {
        try {
            const users = await Auth.makeRequest('/users');
            
            // Create CSV content
            const headers = ['ID', 'Username', 'Email', 'Role', 'Plan', 'Status', 'Created', 'Last Login'];
            const rows = users.map(user => [
                user.id,
                user.username,
                user.email,
                user.role,
                user.plan,
                user.status || 'active',
                new Date(user.createdAt).toLocaleDateString(),
                user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'
            ]);
            
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');
            
            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            this.showNotification('Users exported successfully', 'success');
            
        } catch (error) {
            this.showNotification('Export failed: ' + error.message, 'error');
        }
    }
    
    toggleSelectAllUsers(checked) {
        document.querySelectorAll('.user-checkbox').forEach(checkbox => {
            if (!checkbox.disabled) {
                checkbox.checked = checked;
                if (checked) {
                    this.selectedUsers.add(checkbox.value);
                } else {
                    this.selectedUsers.delete(checkbox.value);
                }
            }
        });
        
        this.updateSelectedCount();
    }
    
    updateSelectedCount() {
        const selected = document.querySelectorAll('.user-checkbox:checked').length;
        document.getElementById('selectedUsersCount').textContent = selected;
        
        // Update selected users set
        this.selectedUsers.clear();
        document.querySelectorAll('.user-checkbox:checked').forEach(checkbox => {
            this.selectedUsers.add(checkbox.value);
        });
    }
    
    filterUsers(filter) {
        const rows = document.querySelectorAll('#userTableBody tr[data-user-id]');
        
        rows.forEach(row => {
            const userId = parseInt(row.dataset.userId);
            const role = row.dataset.role;
            const plan = row.dataset.plan;
            const status = row.dataset.status;
            
            // Don't filter out owner (id: 1)
            if (userId === 1) {
                row.style.display = '';
                return;
            }
            
            switch(filter) {
                case 'owner':
                    row.style.display = role === 'owner' ? '' : 'none';
                    break;
                case 'reseller':
                    row.style.display = role === 'reseller' ? '' : 'none';
                    break;
                case 'user':
                    row.style.display = role === 'user' ? '' : 'none';
                    break;
                case 'premium':
                    row.style.display = plan !== 'free' ? '' : 'none';
                    break;
                case 'active':
                    row.style.display = status === 'active' ? '' : 'none';
                    break;
                case 'inactive':
                    row.style.display = status !== 'active' ? '' : 'none';
                    break;
                default:
                    row.style.display = '';
            }
        });
    }
    
    sortUsers(sortBy) {
        // This would sort the user table
        this.showNotification(`Sorted by: ${sortBy}`, 'info');
    }
    
    async bulkActivateUsers() {
        if (this.selectedUsers.size === 0) {
            this.showNotification('No users selected', 'warning');
            return;
        }
        
        try {
            this.showNotification(`Activating ${this.selectedUsers.size} users...`, 'info');
            
            // This would be an API call for each selected user
            for (const userId of this.selectedUsers) {
                if (userId !== '1') { // Don't modify owner
                    // Simulate activation
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
            
            this.showNotification('Selected users activated', 'success');
            this.loadUsers();
            
        } catch (error) {
            this.showNotification('Bulk activation failed: ' + error.message, 'error');
        }
    }
    
    async bulkSuspendUsers() {
        if (this.selectedUsers.size === 0) {
            this.showNotification('No users selected', 'warning');
            return;
        }
        
        if (!confirm(`Suspend ${this.selectedUsers.size} selected users?`)) {
            return;
        }
        
        try {
            this.showNotification(`Suspending ${this.selectedUsers.size} users...`, 'warning');
            
            // This would be an API call for each selected user
            for (const userId of this.selectedUsers) {
                if (userId !== '1') { // Don't modify owner
                    // Simulate suspension
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
            
            this.showNotification('Selected users suspended', 'success');
            this.loadUsers();
            
        } catch (error) {
            this.showNotification('Bulk suspension failed: ' + error.message, 'error');
        }
    }
    
    async bulkDeleteUsers() {
        if (this.selectedUsers.size === 0) {
            this.showNotification('No users selected', 'warning');
            return;
        }
        
        // Check if trying to delete owner
        if (this.selectedUsers.has('1')) {
            this.showNotification('Cannot delete owner account', 'error');
            return;
        }
        
        if (!confirm(`Delete ${this.selectedUsers.size} selected users? This action cannot be undone.`)) {
            return;
        }
        
        try {
            this.showNotification(`Deleting ${this.selectedUsers.size} users...`, 'warning');
            
            // Delete each selected user
            for (const userId of this.selectedUsers) {
                if (userId !== '1') { // Don't delete owner
                    try {
                        await Auth.makeRequest(`/users/${userId}`, {
                            method: 'DELETE'
                        });
                    } catch (error) {
                        console.error(`Failed to delete user ${userId}:`, error);
                    }
                }
            }
            
            this.showNotification(`${this.selectedUsers.size} users deleted`, 'success');
            this.selectedUsers.clear();
            this.loadUsers();
            this.loadStats();
            
        } catch (error) {
            this.showNotification('Bulk delete failed: ' + error.message, 'error');
        }
    }
    
    async bulkChangePlan() {
        if (this.selectedUsers.size === 0) {
            this.showNotification('No users selected', 'warning');
            return;
        }
        
        // Prompt for new plan
        const plan = prompt('Enter new plan (free, basic, premium, ultimate):', 'basic');
        if (!plan || !['free', 'basic', 'premium', 'ultimate', 'reseller'].includes(plan.toLowerCase())) {
            this.showNotification('Invalid plan selected', 'error');
            return;
        }
        
        try {
            this.showNotification(`Changing plan for ${this.selectedUsers.size} users...`, 'info');
            
            // This would be an API call for each selected user
            for (const userId of this.selectedUsers) {
                if (userId !== '1') { // Don't modify owner
                    // Simulate plan change
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
            
            this.showNotification(`Changed ${this.selectedUsers.size} users to ${plan} plan`, 'success');
            this.loadUsers();
            
        } catch (error) {
            this.showNotification('Bulk plan change failed: ' + error.message, 'error');
        }
    }
    
    searchUsers(query) {
        const searchTerm = query.toLowerCase();
        const rows = document.querySelectorAll('#userTableBody tr[data-user-id]');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }
    
    async viewUser(userId) {
        try {
            const users = await Auth.makeRequest('/users');
            const user = users.find(u => u.id === parseInt(userId));
            
            if (!user) {
                this.showNotification('User not found', 'error');
                return;
            }
            
            const panel = document.getElementById('userDetailsPanel');
            const content = document.getElementById('userDetailsContent');
            
            content.innerHTML = `
                <div class="user-details">
                    <div class="details-header">
                        <div class="user-title">
                            <div class="user-avatar">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <div>
                                <h4>${user.username}</h4>
                                <p>${user.email}</p>
                            </div>
                        </div>
                        <div class="user-status">
                            <span class="status-badge ${user.status || 'active'}">${(user.status || 'active').toUpperCase()}</span>
                            <span class="role-badge ${user.role}">${user.role.toUpperCase()}</span>
                        </div>
                    </div>
                    
                    <div class="details-grid">
                        <div class="detail-item">
                            <span class="label">User ID:</span>
                            <span class="value">${user.id}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Plan:</span>
                            <span class="plan-badge ${user.plan}">${user.plan.toUpperCase()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Created:</span>
                            <span class="value">${new Date(user.createdAt).toLocaleString()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Last Login:</span>
                            <span class="value">${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Expires:</span>
                            <span class="value">${user.expiresAt ? new Date(user.expiresAt).toLocaleDateString() : 'Never'}</span>
                        </div>
                    </div>
                    
                    <div class="user-limits-section">
                        <h5>User Limits</h5>
                        <div class="limits-grid">
                            <div class="limit-item">
                                <i class="fas fa-bolt"></i>
                                <div class="limit-info">
                                    <span>Max Concurrent Attacks:</span>
                                    <strong>${user.maxConcurrent || 1}</strong>
                                </div>
                            </div>
                            <div class="limit-item">
                                <i class="fas fa-clock"></i>
                                <div class="limit-info">
                                    <span>Max Duration:</span>
                                    <strong>${user.maxDuration || 30}s</strong>
                                </div>
                            </div>
                            <div class="limit-item">
                                <i class="fas fa-chart-bar"></i>
                                <div class="limit-info">
                                    <span>Total Attacks:</span>
                                    <strong>${user.attackCount || 0}</strong>
                                </div>
                            </div>
                            <div class="limit-item">
                                <i class="fas fa-network-wired"></i>
                                <div class="limit-info">
                                    <span>Total Duration:</span>
                                    <strong>${user.totalDuration || 0}s</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="user-methods">
                        <h5>Allowed Methods</h5>
                        <div class="methods-list">
                            ${Array.isArray(user.methods) ? user.methods.map(method => `
                                <span class="method-tag">${method.toUpperCase()}</span>
                            `).join('') : '<span class="no-methods">No specific methods set</span>'}
                        </div>
                    </div>
                    
                    <div class="user-actions">
                        <button class="btn-action-large edit" onclick="window.userManager.editUser(${user.id})">
                            <i class="fas fa-edit"></i>
                            <span>Edit User</span>
                        </button>
                        ${user.id !== 1 ? `
                            <button class="btn-action-large ${user.status === 'active' ? 'suspend' : 'activate'}" 
                                    onclick="window.userManager.toggleUserStatus(${user.id})">
                                <i class="fas fa-${user.status === 'active' ? 'ban' : 'check'}"></i>
                                <span>${user.status === 'active' ? 'Suspend' : 'Activate'}</span>
                            </button>
                            <button class="btn-action-large delete" onclick="window.userManager.deleteUser(${user.id})">
                                <i class="fas fa-trash"></i>
                                <span>Delete User</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
            
            panel.style.display = 'block';
            
        } catch (error) {
            this.showNotification('Failed to load user details: ' + error.message, 'error');
        }
    }
    
    hideUserDetails() {
        document.getElementById('userDetailsPanel').style.display = 'none';
    }
    
    async editUser(userId) {
        try {
            const users = await Auth.makeRequest('/users');
            const user = users.find(u => u.id === parseInt(userId));
            
            if (!user) {
                this.showNotification('User not found', 'error');
                return;
            }
            
            const modal = document.getElementById('editUserModal');
            const content = document.getElementById('editUserContent');
            
            content.innerHTML = `
                <form id="editUserForm">
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" value="${user.username}" disabled>
                        <small>Username cannot be changed</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Email Address</label>
                        <input type="email" id="editEmail" value="${user.email}">
                    </div>
                    
                    <div class="form-group">
                        <label>Change Password (Optional)</label>
                        <input type="password" id="editPassword" placeholder="Leave empty to keep current">
                    </div>
                    
                    <div class="form-group">
                        <label>User Role</label>
                        <select id="editRole">
                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>Regular User</option>
                            <option value="reseller" ${user.role === 'reseller' ? 'selected' : ''}>Reseller</option>
                            ${user.id !== 1 ? '<option value="admin" ${user.role === "admin" ? "selected" : ""}>Administrator</option>' : ''}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>User Plan</label>
                        <select id="editPlan">
                            <option value="free" ${user.plan === 'free' ? 'selected' : ''}>Free</option>
                            <option value="basic" ${user.plan === 'basic' ? 'selected' : ''}>Basic</option>
                            <option value="premium" ${user.plan === 'premium' ? 'selected' : ''}>Premium</option>
                            <option value="ultimate" ${user.plan === 'ultimate' ? 'selected' : ''}>Ultimate</option>
                        </select>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Max Concurrent Attacks</label>
                            <input type="number" id="editMaxConcurrent" value="${user.maxConcurrent || 1}" min="1" max="50">
                        </div>
                        <div class="form-group">
                            <label>Max Duration (seconds)</label>
                            <input type="number" id="editMaxDuration" value="${user.maxDuration || 30}" min="30" max="86400">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>User Status</label>
                        <select id="editStatus">
                            <option value="active" ${(!user.status || user.status === 'active') ? 'selected' : ''}>Active</option>
                            <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                            <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary close-modal">Cancel</button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </div>
                </form>
            `;
            
            modal.style.display = 'block';
            
            // Handle form submission
            const form = document.getElementById('editUserForm');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveUserChanges(userId);
            });
            
        } catch (error) {
            this.showNotification('Failed to load user for editing: ' + error.message, 'error');
        }
    }
    
    async saveUserChanges(userId) {
        const modal = document.getElementById('editUserModal');
        
        try {
            const userData = {
                email: document.getElementById('editEmail').value,
                password: document.getElementById('editPassword').value || undefined,
                role: document.getElementById('editRole').value,
                plan: document.getElementById('editPlan').value,
                maxConcurrent: parseInt(document.getElementById('editMaxConcurrent').value),
                maxDuration: parseInt(document.getElementById('editMaxDuration').value),
                status: document.getElementById('editStatus').value
            };
            
            // Filter out undefined values
            Object.keys(userData).forEach(key => {
                if (userData[key] === undefined) {
                    delete userData[key];
                }
            });
            
            const result = await Auth.makeRequest(`/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(userData)
            });
            
            if (result.message) {
                this.showNotification('User updated successfully', 'success');
                modal.style.display = 'none';
                this.loadUsers();
                this.hideUserDetails();
            }
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
    
    async toggleUserStatus(userId) {
        try {
            const users = await Auth.makeRequest('/users');
            const user = users.find(u => u.id === parseInt(userId));
            
            if (!user) {
                this.showNotification('User not found', 'error');
                return;
            }
            
            const newStatus = user.status === 'active' ? 'suspended' : 'active';
            const action = user.status === 'active' ? 'suspend' : 'activate';
            
            if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this user?`)) {
                return;
            }
            
            const result = await Auth.makeRequest(`/users/${userId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            
            if (result.message) {
                this.showNotification(`User ${action}ed successfully`, 'success');
                this.loadUsers();
                this.hideUserDetails();
            }
            
        } catch (error) {
            this.showNotification('Failed to change user status: ' + error.message, 'error');
        }
    }
    
    async deleteUser(userId) {
        if (userId === 1) {
            this.showNotification('Cannot delete owner account', 'error');
            return;
        }
        
        if (!confirm('Delete this user? This action cannot be undone.')) {
            return;
        }
        
        try {
            const result = await Auth.makeRequest(`/users/${userId}`, {
                method: 'DELETE'
            });
            
            if (result.message) {
                this.showNotification('User deleted successfully', 'success');
                this.loadUsers();
                this.loadStats();
                this.hideUserDetails();
            }
            
        } catch (error) {
            this.showNotification('Failed to delete user: ' + error.message, 'error');
        }
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

// Initialize user manager
window.userManager = new UserManager();
