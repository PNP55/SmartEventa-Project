/* ── Events Page JavaScript ─────────────────────────────────────── */

// State
let allEvents = [];
let filteredEvents = [];
let currentPage = 1;
const PAGE_SIZE = 9;
let activeStatusFilter = 'all';
let activeCategoryFilter = '';
let searchQuery = '';
let searchDebounceTimer = null;
let favoriteIds = [];

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  updateNavAuth();
  readUrlParams();
  loadEvents();
  initSearch();
  initFilters();
});

/* ── Navbar ─────────────────────────────────────────────────────── */
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
      <button onclick="Auth.clearSession(); location.reload();" class="btn-nav-cta" style="background:rgba(239,68,68,0.15);color:var(--danger);border:1px solid rgba(239,68,68,0.3);">Logout</button>
    `;
  }
}

/* ── Read URL params ────────────────────────────────────────────── */
function readUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('category');
  const status = params.get('status');
  if (cat) {
    activeCategoryFilter = cat;
    const sel = document.getElementById('category-select');
    if (sel) sel.value = cat;
  }
  if (status) {
    activeStatusFilter = status;
    updateStatusFilterButtons(status);
  }
}

/* ── Load Events from API ───────────────────────────────────────── */
async function loadEvents() {
  const grid = document.getElementById('events-grid');
  grid.innerHTML = `<div class="events-loading"><div class="loading-spinner"></div><p>Loading events...</p></div>`;

  try {
    favoriteIds = await getFavoriteIds();
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (activeCategoryFilter) params.set('category', activeCategoryFilter);
    params.set('limit', '100'); // Load all, filter by status client-side

    const data = await apiCall(`/events?${params.toString()}`);
    allEvents = data.events || [];
    applyFilters();
  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔌</div>
        <h3>Cannot connect to server</h3>
        <p>Make sure the SmartEventa backend is running on <strong>https://smarteventa-backend.onrender.com</strong></p>
      </div>
    `;
    document.getElementById('results-summary').textContent = '';
  }
}

/* ── Apply Filters ──────────────────────────────────────────────── */
function applyFilters() {
  filteredEvents = allEvents.filter((event) => {
    // Status filter
    if (activeStatusFilter !== 'all' && event.status !== activeStatusFilter) {
      return false;
    }
    return true;
  });

  currentPage = 1;
  renderPage();
}

/* ── Render Current Page ────────────────────────────────────────── */
function renderPage() {
  const grid = document.getElementById('events-grid');
  const summary = document.getElementById('results-summary');
  const loadMoreWrapper = document.getElementById('load-more-wrapper');

  const total = filteredEvents.length;
  const pageItems = filteredEvents.slice(0, currentPage * PAGE_SIZE);

  // Summary
  if (searchQuery || activeStatusFilter !== 'all' || activeCategoryFilter) {
    summary.textContent = `${total} event${total !== 1 ? 's' : ''} found`;
  } else {
    summary.textContent = `${total} event${total !== 1 ? 's' : ''} available`;
  }

  // Empty state
  if (total === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>No events found</h3>
        <p>Try adjusting your search or filters.</p>
      </div>
    `;
    loadMoreWrapper.style.display = 'none';
    return;
  }

  // Render cards
  grid.innerHTML = pageItems.map((e) => renderEventCard(e)).join('');

  // Load more
  const hasMore = total > currentPage * PAGE_SIZE;
  loadMoreWrapper.style.display = hasMore ? 'block' : 'none';
}

/* ── Render Event Card ──────────────────────────────────────────── */
function renderEventCard(event) {
  const image = event.image || PLACEHOLDER_IMAGE;
  const status = event.status || 'upcoming';
  const date = formatEventDate(event.date);

  return `
    <div class="event-card"
      onclick="window.location.href='event-details.html?id=${event._id}'"
      role="button" tabindex="0"
      aria-label="View ${event.title}">
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

/* ── Search ─────────────────────────────────────────────────────── */
function initSearch() {
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear');

  input?.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    clearBtn?.classList.toggle('visible', val.length > 0);
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      searchQuery = val;
      loadEvents();
    }, 400);
  });

  clearBtn?.addEventListener('click', () => {
    if (input) input.value = '';
    clearBtn.classList.remove('visible');
    searchQuery = '';
    loadEvents();
  });
}

/* ── Filters ────────────────────────────────────────────────────── */
function initFilters() {
  // Status filters
  document.querySelectorAll('[data-filter="status"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeStatusFilter = btn.dataset.value;
      updateStatusFilterButtons(activeStatusFilter);
      applyFilters();
    });
  });

  // Category select
  const catSel = document.getElementById('category-select');
  catSel?.addEventListener('change', () => {
    activeCategoryFilter = catSel.value;
    loadEvents();
  });

  // Load more
  document.getElementById('load-more-btn')?.addEventListener('click', () => {
    currentPage++;
    renderPage();
  });
}

function updateStatusFilterButtons(activeValue) {
  document.querySelectorAll('[data-filter="status"]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.value === activeValue);
  });
}

/* ── Shared Helpers (duplicated from index.js for standalone page) ── */
function formatEventDate(dateStr) {
  if (!dateStr) return 'Date TBA';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

function getStatusBadge(status) {
  const map = { upcoming: { label: 'Upcoming', class: 'badge-upcoming' }, ongoing: { label: 'Live Now', class: 'badge-ongoing' }, past: { label: 'Past', class: 'badge-past' } };
  const s = map[status] || map['upcoming'];
  return `<span class="badge ${s.class}">${s.label}</span>`;
}

function truncate(text, max = 120) {
  if (!text) return '';
  return text.length > max ? text.substring(0, max).trim() + '...' : text;
}
