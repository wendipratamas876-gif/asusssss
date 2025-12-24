class Auth {
    constructor() {
        // Gunakan relative path untuk API
        this.apiUrl = '/api';
        console.log('Auth initialized with API URL:', this.apiUrl);
        this.init();
    }
    
    init() {
        console.log('Auth init started');
        this.checkAPIStatus();
        this.setupEventListeners();
        this.checkAuth();
    }
    
    async checkAPIStatus() {
        try {
            console.log('Checking API status...');
            const response = await fetch(`${this.apiUrl}/health`);
            const data = await response.json();
            console.log('API Health:', data);
            
            const statusElement = document.getElementById('apiStatus');
            if (statusElement) {
                statusElement.innerHTML = '<span class="status-ok">Online</span>';
            }
        } catch (error) {
            console.error('API check failed:', error);
            const statusElement = document.getElementById('apiStatus');
            if (statusElement) {
                statusElement.innerHTML = '<span class="status-error">Offline</span>';
            }
        }
    }
    
    setupEventListeners() {
        console.log('Setting up event listeners');
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
            
            // Toggle password
            const toggleBtn = document.getElementById('togglePassword');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', this.togglePasswordVisibility);
            }
        }
    }
    
    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const icon = this.querySelector('i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        console.log('Login form submitted');
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');
        const spinner = document.getElementById('loginSpinner');
        
        // Validate
        if (!username || !password) {
            this.showNotification('Please enter username and password', 'error');
            return;
        }
        
        loginBtn.disabled = true;
        if (spinner) spinner.style.display = 'inline-block';
        
        try {
            console.log('Sending login request...');
            
            const response = await fetch(`${this.apiUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    username: username.trim(), 
                    password: password.trim() 
                })
            });
            
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);
            
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }
            
            if (data.success && data.token) {
                // Store credentials
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                this.showNotification('✅ Login successful! Redirecting...', 'success');
                
                // Redirect after delay
                setTimeout(() => {
                    window.location.href = 'panel.html';
                }, 1000);
            } else {
                throw new Error('Invalid response from server');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification(`❌ ${error.message}`, 'error');
        } finally {
            loginBtn.disabled = false;
            if (spinner) spinner.style.display = 'none';
        }
    }
    
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
    
    showNotification(message, type = 'info') {
        console.log('Notification:', message);
        
        // Create or get notification element
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        // Auto hide
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }
    
    checkAuth() {
        const token = localStorage.getItem('token');
        const currentPage = window.location.pathname;
        
        if (token && currentPage.includes('index.html')) {
            window.location.href = 'panel.html';
        } else if (!token && !currentPage.includes('index.html')) {
            window.location.href = 'index.html';
        }
    }
    
    static getToken() {
        return localStorage.getItem('token');
    }
    
    static getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
    
    static isAuthenticated() {
        return !!localStorage.getItem('token');
    }
    
    static async makeRequest(endpoint, options = {}) {
        const token = Auth.getToken();
        const apiUrl = window.auth?.apiUrl || '/api';
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            }
        };
        
        try {
            const response = await fetch(`${apiUrl}${endpoint}`, {
                ...defaultOptions,
                ...options
            });
            
            if (response.status === 401) {
                window.auth?.logout();
                return null;
            }
            
            return response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.auth = new Auth();
});
