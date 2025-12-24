// SIMPLE AUTH THAT 100% WORKS
class Auth {
  static apiUrl = '';
  
  static isAuthenticated() {
    return localStorage.getItem('token') !== null;
  }
  
  static getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
  
  static logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  }
  
  static async makeRequest(endpoint, options = {}) {
    try {
      const token = localStorage.getItem('token');
      
      const defaultOptions = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      };
      
      const response = await fetch(`/api${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
          ...defaultOptions.headers,
          ...options.headers
        }
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('API Request error:', error);
      throw error;
    }
  }
}

// Make Auth available globally
window.Auth = Auth;

// Simple login handler
document.addEventListener('DOMContentLoaded', function() {
  console.log('Auth script loaded');
  
  // Handle login form if on login page
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const loginBtn = document.getElementById('loginBtn');
      const loginSpinner = document.getElementById('loginSpinner');
      
      // Show loading
      loginBtn.disabled = true;
      if (loginSpinner) loginSpinner.style.display = 'inline-block';
      loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
      
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
          // Store auth data
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          // Show success
          showNotification('✅ Login successful! Redirecting...', 'success');
          
          // Redirect after delay
          setTimeout(() => {
            window.location.href = 'panel.html';
          }, 1000);
          
        } else {
          showNotification(`❌ ${data.error || 'Login failed'}`, 'error');
        }
        
      } catch (error) {
        console.error('Login error:', error);
        showNotification('❌ Network error: ' + error.message, 'error');
      } finally {
        // Reset button
        loginBtn.disabled = false;
        if (loginSpinner) loginSpinner.style.display = 'none';
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
      }
    });
  }
  
  // Password toggle
  const toggleBtn = document.getElementById('togglePassword');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
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
    });
  }
  
  // Check API status on login page
  if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    checkAPIStatus();
  }
});

// API status check
async function checkAPIStatus() {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    
    const statusEl = document.getElementById('apiStatus');
    if (statusEl) {
      statusEl.innerHTML = '<span class="status-ok">Online</span>';
    }
  } catch (error) {
    console.error('API check failed:', error);
    const statusEl = document.getElementById('apiStatus');
    if (statusEl) {
      statusEl.innerHTML = '<span class="status-error">Offline</span>';
    }
  }
}

// Notification function
function showNotification(message, type = 'info') {
  // Remove existing notification
  const oldNotification = document.getElementById('notification');
  if (oldNotification) oldNotification.remove();
  
  // Create new notification
  const notification = document.createElement('div');
  notification.id = 'notification';
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Test function for debugging
window.testLogin = async function() {
  console.log('Testing login with hardcoded credentials...');
  
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'kelvinvmxz' })
  });
  
  console.log('Test response:', await response.json());
};
