class Auth {
    constructor() {
        this.apiUrl = window.location.origin.includes('localhost') 
            ? 'http://localhost:3000/api'
            : '/api';
        
        this.init();
    }
    
    init() {
        this.checkAPIStatus();
        this.setupEventListeners();
        this.checkAuth();
    }
    
    async checkAPIStatus() {
        try {
            const response = await fetch(`${this.apiUrl}/health`);
            if (response.ok) {
                document.getElementById('apiStatus').innerHTML = '<span class="status-ok">Online</span>';
            }
        } catch (error) {
            document.getElementById('apiStatus').innerHTML = '<span class="status-error">Offline</span>';
        }
    }
    
    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
            
            // Toggle password visibility
            const toggleBtn = document.getElementById('togglePassword');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    const passwordInput = document.getElementById('password');
                    const icon = toggleBtn.querySelector('i');
                    
                    if (passwordInput.type === 'password') {
                        passwordInput.type = 'text';
                        icon.classList.remove('fa-eye');
                        icon.classList.add('fa-eye-slash');
                    } else {
                        passwordInput.type = 'password';
                        icon.classList.remove('fa-eye-slash');
                        icon.classList.add('fa-eye');
                    }
                });
            }
        }
    }
    
    checkAuth() {
        const token = localStorage.getItem('token');
        if (token && window.location.pathname.endsWith('index.html')) {
            window.location.href = 'panel.html';
        } else if (!token && !window.location.pathname.endsWith('index.html')) {
            window.location.href = 'index.html';
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');
        const spinner = document.getElementById('loginSpinner');
        
        loginBtn.disabled = true;
        spinner.style.display = 'inline-block';
        
        try {
            const response = await fetch(`${this.apiUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }
            
            // Store token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            this.showNotification('Login successful! Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = 'panel.html';
            }, 1000);
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        } finally {
            loginBtn.disabled = false;
            spinner.style.display = 'none';
        }
    }
    
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;
        
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
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
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };
        
        const response = await fetch(`${window.auth.apiUrl}${endpoint}`, {
            ...defaultOptions,
            ...options
        });
        
        if (response.status === 401) {
            window.auth.logout();
            return null;
        }
        
        return response.json();
    }
}

// Initialize auth
window.auth = new Auth();
