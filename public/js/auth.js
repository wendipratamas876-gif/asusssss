// SIMPLE AUTH THAT 100% WORKS
document.addEventListener('DOMContentLoaded', function() {
  console.log('Auth script loaded');
  
  // Check API status
  checkAPI();
  
  // Setup login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Password toggle
  const toggleBtn = document.getElementById('togglePassword');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', togglePassword);
  }
});

async function checkAPI() {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    console.log('API Health:', data);
    
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

function togglePassword() {
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

async function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const loginBtn = document.getElementById('loginBtn');
  
  console.log('Login attempt:', username, password);
  
  // Show loading
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
  
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        password: password
      })
    });
    
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (response.ok) {
      // Store token
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Show success
      showNotification('✅ Login successful! Redirecting...', 'success');
      
      // Redirect
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
    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
  }
}

function showNotification(message, type) {
  // Remove existing notification
  const oldNotification = document.getElementById('notification');
  if (oldNotification) oldNotification.remove();
  
  // Create new notification
  const notification = document.createElement('div');
  notification.id = 'notification';
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Test function untuk debug
window.testLogin = async function() {
  console.log('Testing login with hardcoded credentials...');
  
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'kelvinvmxz' })
  });
  
  console.log('Test response:', await response.json());
};
