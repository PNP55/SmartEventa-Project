/* ── Favorites Page JavaScript ─────────────────────────────────── */
let favoriteEvents = [];

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  updateNavAuth();
  loadFavorites();
});

function initNavbar() {
  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('nav-links')?.classList.toggle('open');
  });
}

function updateNavAuth() {
  const navAuth = document.getElementById('nav-auth');
  if (!navAuth) return;
  if (!Auth.isLoggedIn()) {
    navAuth.innerHTML = '<a href="login.html" class="nav-link">Login</a><a href="signup.html" class="btn-nav-cta">Get Started</a>';
    return;
  }
  const user = Auth.getUser();
  navAuth.innerHTML = `
    ${user?.role === 'admin' ? '<a href="admin.html" class="nav-link">Dashboard</a>' : ''}
    <button onclick="Auth.clearSession(); location.reload();" class="btn-nav-cta" style="background:rgba(239,68,68,.15);color:var(--danger);border:1px solid rgba(239,68,68,.3);">Logout</button>
  `;
}

async function loadFavorites() {
  const grid = document.getElementById('favorites-grid');
  if (!Auth.isLoggedIn()) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">♡</div>
        <h3>Log in to see your favorites</h3>
        <p>Save events you love and they will appear here.</p>
        <a href="login.html" class="btn-primary" style="margin-top:18px;">Log In</a>
      </div>`;
    return;
  }

  try {
    const data = await apiCall('/events/favorites');
    favoriteEvents = data.events || [];
    renderFavorites();
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">⚡</div><h3>Could not load favorites</h3><p>${err.message || 'Please try again.'}</p></div>`;
  }
}

function renderFavorites() {
  const grid = document.getElementById('favorites-grid');
  if (!favoriteEvents.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">♡</div>
        <h3>Your favorites are empty</h3>
        <p>Tap the heart on an event card to save it here.</p>
        <a href="events.html" class="btn-primary" style="margin-top:18px;">Explore Events</a>
      </div>`;
    return;
  }

  grid.innerHTML = favoriteEvents.map((event) => `
    <div class="event-card" onclick="window.location.href='event-details.html?id=${event._id}'" role="button" tabindex="0">
      <div class="event-card-image">
        ${favoriteButtonHtml(event._id, true)}
        <img src="${event.image || PLACEHOLDER_IMAGE}" alt="${event.title}" loading="lazy"
          onerror="this.src='${PLACEHOLDER_IMAGE}'" />
        <div class="event-card-badge">${getStatusBadge(event.status || 'upcoming')}</div>
      </div>
      <div class="event-card-body">
        <div class="event-card-category">${event.category || 'General'}</div>
        <h3 class="event-card-title">${event.title}</h3>
        <p class="event-card-desc">${truncate(event.description, 110)}</p>
        <div class="event-card-meta">
          <div class="event-meta-item"><span>📅</span><span>${formatEventDate(event.date)}</span></div>
          ${event.time ? `<div class="event-meta-item"><span>🕐</span><span>${event.time}</span></div>` : ''}
          ${event.location ? `<div class="event-meta-item"><span>📍</span><span>${truncate(event.location, 40)}</span></div>` : ''}
        </div>
        <div class="event-card-action"><button class="btn-card-details">View Details →</button></div>
      </div>
    </div>
  `).join('');
}

function onFavoriteChanged(eventId, isFavorite) {
  if (!isFavorite) {
    favoriteEvents = favoriteEvents.filter((event) => event._id !== eventId);
    renderFavorites();
  }
}

function formatEventDate(dateStr) {
  if (!dateStr) return 'Date TBA';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-IN', { weekday:'short', year:'numeric', month:'short', day:'numeric' });
}
function getStatusBadge(status) {
  const map = { upcoming:['Upcoming','badge-upcoming'], ongoing:['Live Now','badge-ongoing'], past:['Past','badge-past'] };
  const s = map[status] || map.upcoming;
  return `<span class="badge ${s[1]}">${s[0]}</span>`;
}
function truncate(text,max=120){ if(!text)return ''; return text.length>max?text.substring(0,max).trim()+'...':text; }
function showToast(message,type='info'){
  const c=document.getElementById('toast-container'); const t=document.createElement('div');
  t.className=`toast toast-${type}`; t.innerHTML=`<span>${type==='success'?'✅':type==='error'?'❌':'ℹ️'}</span> ${message}`;
  c.appendChild(t); setTimeout(()=>t.remove(),4000);
}
