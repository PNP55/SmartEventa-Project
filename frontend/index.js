/* ── Home Page JavaScript ─────────────────────────────────────── */
let favoriteIds = [];

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  updateNavAuth();
  animateStats();
  loadFeaturedEvents();
  initScrollAnimations();
});

/* ── Navbar ─────────────────────────────────────────────────────── */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');

  // Scroll behavior
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });

  // Hamburger
  hamburger?.addEventListener('click', () => {
    navLinks?.classList.toggle('open');
  });

  // Close menu on link click
  navLinks?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

/* ── Update nav based on auth state ────────────────────────────── */
function updateNavAuth() {
  const navAuth = document.getElementById('nav-auth');
  if (!navAuth) return;

  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    const isAdmin = user?.role === 'admin';
    navAuth.innerHTML = `
      ${isAdmin ? '<a href="admin.html" class="nav-link">Dashboard</a>' : ''}
      <span class="nav-link" style="color: var(--text-secondary); font-size:0.85rem;">
        Hi, ${user?.name?.split(' ')[0] || 'User'}
      </span>
      <button onclick="handleLogout()" class="btn-nav-cta" style="background: rgba(239,68,68,0.15); color: var(--danger); border: 1px solid rgba(239,68,68,0.3);">
        Logout
      </button>
    `;
  }
}

function handleLogout() {
  Auth.clearSession();
  showToast('Logged out successfully.', 'info');
  setTimeout(() => window.location.reload(), 800);
}

/* ── Animate Stats Counter ──────────────────────────────────────── */
function animateStats() {
  const statEl = document.getElementById('stat-events');
  if (!statEl) return;

  // Fetch real count
  fetch(`${CONFIG.API_BASE_URL}/events?limit=1`)
    .then((r) => r.json())
    .then((data) => {
      const target = data.total || 0;
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 40));
      const interval = setInterval(() => {
        current = Math.min(current + step, target);
        statEl.textContent = current;
        if (current >= target) clearInterval(interval);
      }, 50);
    })
    .catch(() => {
      statEl.textContent = '10+';
    });
}

/* ── Load Featured Events ───────────────────────────────────────── */
async function loadFeaturedEvents() {
  const grid = document.getElementById('featured-events-grid');
  if (!grid) return;

  try {
    favoriteIds = await getFavoriteIds();
    const data = await apiCall('/events?limit=3');
    const events = data.events || [];

    if (events.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎭</div>
          <h3>No events yet</h3>
          <p>Check back soon — events are being added by our admins.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = events.map((e) => renderEventCard(e)).join('');
  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚡</div>
        <h3>Events unavailable</h3>
        <p>Make sure the backend is running. <a href="events.html" style="color:var(--primary)">Try the events page →</a></p>
      </div>
    `;
  }
}

/* ── Render Event Card ──────────────────────────────────────────── */
function renderEventCard(event) {
  const image = event.image || PLACEHOLDER_IMAGE;
  const status = event.status || 'upcoming';
  const date = formatEventDate(event.date);

  return `
    <div class="event-card" onclick="window.location.href='event-details.html?id=${event._id}'" role="button" tabindex="0" aria-label="${event.title}">
      <div class="event-card-image">
        ${favoriteButtonHtml(event._id, favoriteIds.includes(event._id))}
        <img src="${image}" alt="${event.title}" loading="lazy"
          onerror="this.src='${PLACEHOLDER_IMAGE}'" />
        <div class="event-card-badge">${getStatusBadge(status)}</div>
      </div>
      <div class="event-card-body">
        <div class="event-card-category">${event.category || 'General'}</div>
        <h3 class="event-card-title">${event.title}</h3>
        <p class="event-card-desc">${truncate(event.description, 110)}</p>
        <div class="event-card-meta">
          <div class="event-meta-item">
            <span>📅</span>
            <span>${date}</span>
          </div>
          ${event.time ? `<div class="event-meta-item"><span>🕐</span><span>${event.time}</span></div>` : ''}
          ${event.location ? `<div class="event-meta-item"><span>📍</span><span>${truncate(event.location, 40)}</span></div>` : ''}
        </div>
        <div class="event-card-action">
          <button class="btn-card-details">View Details →</button>
        </div>
      </div>
    </div>
  `;
}

/* ── Scroll Animations ──────────────────────────────────────────── */
function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('.step-card, .feature-card').forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
}

/* ── Toast Notifications ────────────────────────────────────────── */
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 4000);
}

// Keyboard navigation for cards
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.classList.contains('event-card')) {
    e.target.click();
  }
});
