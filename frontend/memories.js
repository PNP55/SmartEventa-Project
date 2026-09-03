/* ── Memories Page JavaScript ───────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  updateNavAuth();
  loadMemories();
});

function initNavbar() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  hamburger?.addEventListener('click', () => navLinks?.classList.toggle('open'));
  navLinks?.querySelectorAll('a').forEach((l) => l.addEventListener('click', () => navLinks.classList.remove('open')));
}

function updateNavAuth() {
  const navAuth = document.getElementById('nav-auth');
  if (!navAuth) return;
  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    navAuth.innerHTML = `
      ${user?.role === 'admin' ? '<a href="admin.html" class="nav-link">Dashboard</a>' : ''}
      <a href="favorites.html" class="nav-link">Favorites</a>
      <button onclick="Auth.clearSession(); location.reload();" class="btn-nav-cta" style="background:rgba(220,38,38,0.1);color:var(--danger);border:1px solid rgba(220,38,38,0.2);">Logout</button>
    `;
  }
}

/* ── Load Dynamic 7-Day Event Memories ────────────────────────────── */
async function loadMemories() {
  const grid = document.getElementById('memories-grid');
  if (!grid) return;

  grid.innerHTML = `<div class="events-loading"><div class="loading-spinner"></div><p>Loading recent event memories...</p></div>`;

  try {
    const data = await apiCall('/events/memories');
    const memories = data.memories || [];

    if (memories.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div style="font-size: 3rem; margin-bottom: 12px;">📸</div>
          <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">No Recent Event Memories</h3>
          <p style="color: var(--text-secondary); max-width: 440px; margin: 0 auto 20px;">
            Events that concluded in the last 7 days automatically appear in this archive gallery. Check back soon after upcoming events finish!
          </p>
          <a href="events.html" class="btn-primary">Browse Upcoming Events →</a>
        </div>
      `;
      return;
    }

    grid.innerHTML = memories.map((event) => renderMemoryCard(event)).join('');
  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state">
        <div style="font-size: 3rem; margin-bottom: 12px;">🔌</div>
        <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">Memories Currently Unavailable</h3>
        <p style="color: var(--text-secondary); max-width: 400px; margin: 0 auto 16px;">
          Make sure the SmartEventa backend server is running on <strong>https://smarteventa-backend.onrender.com</strong>
        </p>
        <a href="events.html" class="btn-primary">Explore Events Directory →</a>
      </div>
    `;
  }
}

/* ── Render Memory Card ─────────────────────────────────────────── */
function renderMemoryCard(event) {
  const image = event.image || PLACEHOLDER_IMAGE;
  const dateStr = formatEventDate(event.date);

  return `
    <div class="memory-card"
      onclick="window.location.href='memories-details.html?id=${event._id}'"
      role="button" tabindex="0"
      aria-label="View memory of ${event.title}">
      
      <div class="memory-card-image">
        <img src="${image}" alt="${event.title}" loading="lazy"
          onerror="this.src='${PLACEHOLDER_IMAGE}'" />
        <span class="memory-tag">${event.category || 'General'}</span>
        <span class="memory-status-badge">Completed</span>
      </div>

      <div class="memory-card-body">
        <h3 class="memory-card-title">${event.title}</h3>
        
        <div class="memory-card-meta">
          <div class="memory-meta-row">
            <span>📅</span>
            <span>${dateStr}</span>
          </div>
          ${event.location ? `<div class="memory-meta-row"><span>📍</span><span>${truncate(event.location, 45)}</span></div>` : ''}
        </div>

        <div class="memory-card-footer">
          <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 500;">Archive Memory</span>
          <span class="memory-link-btn">View Memory →</span>
        </div>
      </div>

    </div>
  `;
}

function formatEventDate(dateStr) {
  if (!dateStr) return 'Date TBA';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

function truncate(text, max = 120) {
  if (!text) return '';
  return text.length > max ? text.substring(0, max).trim() + '...' : text;
}
