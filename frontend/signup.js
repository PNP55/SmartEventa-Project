/* ── Signup Page JavaScript ─────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  if (Auth.isLoggedIn()) {
    window.location.href = 'events.html';
    return;
  }
  initForm();
  initPasswordStrength();
  initPasswordToggle();
});

function initForm() {
  document.getElementById('signup-form')?.addEventListener('submit', handleSignup);
}

function initPasswordToggle() {
  const toggle = document.getElementById('password-toggle');
  const input = document.getElementById('password');
  toggle?.addEventListener('click', () => {
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    toggle.textContent = isText ? '👁' : '🙈';
  });
}

function initPasswordStrength() {
  const input = document.getElementById('password');
  input?.addEventListener('input', () => {
    const val = input.value;
    const strength = getPasswordStrength(val);
    updateStrengthBars(strength);
  });
}

function getPasswordStrength(password) {
  if (password.length < 6) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(3, score);
}

function updateStrengthBars(strength) {
  const classes = ['active-weak', 'active-medium', 'active-strong'];
  for (let i = 1; i <= 3; i++) {
    const bar = document.getElementById(`bar-${i}`);
    if (!bar) continue;
    bar.className = 'strength-bar';
    if (i <= strength) {
      bar.classList.add(classes[strength - 1]);
    }
  }
}

async function handleSignup(e) {
  e.preventDefault();
  hideAlert();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('signup-btn');

  if (!name || !email || !password) {
    showAlert('Please fill in all fields.', 'error');
    return;
  }

  if (name.length < 2) {
    showAlert('Name must be at least 2 characters.', 'error');
    return;
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    showAlert('Please enter a valid email address.', 'error');
    return;
  }

  if (password.length < 6) {
    showAlert('Password must be at least 6 characters.', 'error');
    return;
  }

  btn.classList.add('btn-loading');
  btn.innerHTML = '<span class="loading-spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;margin-right:8px;"></span> Creating account...';

  try {
    const data = await apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    Auth.setSession(data.token, data.user);
    showAlert('Account created! Redirecting...', 'success');

    setTimeout(() => {
      window.location.href = 'events.html';
    }, 1000);
  } catch (err) {
    showAlert(err.message || 'Signup failed. Please try again.', 'error');
    btn.classList.remove('btn-loading');
    btn.innerHTML = 'Create Account';
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
