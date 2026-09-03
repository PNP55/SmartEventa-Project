/* ── Login Page JavaScript ──────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    window.location.href = user?.role === 'admin' ? 'admin.html' : 'events.html';
    return;
  }

  initForm();
  initPasswordToggle();
});

function initForm() {
  const form = document.getElementById('login-form');
  form?.addEventListener('submit', handleLogin);
}

function initPasswordToggle() {
  const toggle = document.getElementById('password-toggle');
  const passwordInput = document.getElementById('password');
  toggle?.addEventListener('click', () => {
    const isText = passwordInput.type === 'text';
    passwordInput.type = isText ? 'password' : 'text';
    toggle.textContent = isText ? '👁' : '🙈';
  });
}

async function handleLogin(e) {
  e.preventDefault();
  hideAlert();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('login-btn');

  // Validation
  if (!email || !password) {
    showAlert('Please enter both email and password.', 'error');
    return;
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    showAlert('Please enter a valid email address.', 'error');
    return;
  }

  // Loading state
  btn.classList.add('btn-loading');
  btn.innerHTML = '<span class="loading-spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;margin-right:8px;"></span> Signing in...';

  try {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Save session
    Auth.setSession(data.token, data.user);

    showAlert('Login successful! Redirecting...', 'success');

    setTimeout(() => {
      if (data.user.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'events.html';
      }
    }, 800);
  } catch (err) {
    showAlert(err.message || 'Login failed. Please try again.', 'error');
    btn.classList.remove('btn-loading');
    btn.innerHTML = 'Sign In';
  }
}

function showAlert(message, type) {
  const alert = document.getElementById('auth-alert');
  if (!alert) return;
  alert.className = `auth-alert ${type}`;
  alert.textContent = message;
  alert.style.display = 'flex';
}

function hideAlert() {
  const alert = document.getElementById('auth-alert');
  if (alert) alert.style.display = 'none';
}
