/**
 * SmartEventa AI — Centralized API Configuration
 * All frontend files import from this file.
 * Change only this file to update the backend URL.
 */
const CONFIG = {
  API_BASE_URL: 'https://smarteventa-backend.onrender.com/api',
  APP_NAME: 'SmartEventa AI',
  APP_TAGLINE: 'Discover. Manage. Experience Events Smarter.',
};

// Auth helpers
const Auth = {
  getToken: () => localStorage.getItem('se_token'),
  getUser: () => {
    try {
      const u = localStorage.getItem('se_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  setSession: (token, user) => {
    localStorage.setItem('se_token', token);
    localStorage.setItem('se_user', JSON.stringify(user));
  },
  clearSession: () => {
    localStorage.removeItem('se_token');
    localStorage.removeItem('se_user');
  },
  isLoggedIn: () => !!localStorage.getItem('se_token'),
  isAdmin: () => {
    const user = Auth.getUser();
    return user && user.role === 'admin';
  },
};

// API helper — makes authenticated fetch calls
async function apiCall(endpoint, options = {}) {
  const token = Auth.getToken();
  const url = `${CONFIG.API_BASE_URL}${endpoint}`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    // Handle 401 — session expired
    if (response.status === 401) {
      Auth.clearSession();
      window.location.href = 'login.html';
    }
    throw new Error(data.message || `HTTP Error ${response.status}`);
  }

  return data;
}

// Format date for display
function formatEventDate(dateStr) {
  if (!dateStr) return 'Date TBA';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Get status badge HTML
function getStatusBadge(status) {
  const map = {
    upcoming: { label: 'Upcoming', class: 'badge-upcoming' },
    ongoing: { label: 'Live Now', class: 'badge-ongoing' },
    past: { label: 'Past', class: 'badge-past' },
  };
  const s = map[status] || map['upcoming'];
  return `<span class="badge ${s.class}">${s.label}</span>`;
}

// Truncate text
function truncate(text, maxLength = 120) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength).trim() + '...' : text;
}

// Placeholder image for events without images
const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22800%22 height%3D%22400%22 viewBox%3D%220 0 800 400%22%3E%3Crect fill%3D%22%231a1a2e%22 width%3D%22800%22 height%3D%22400%22%2F%3E%3Crect fill%3D%22%2316213e%22 x%3D%2250%22 y%3D%2250%22 rx%3D%2220%22 width%3D%22700%22 height%3D%22300%22%2F%3E%3Ctext fill%3D%22%234a9eff%22 font-family%3D%22Arial%22 font-size%3D%2260%22 text-anchor%3D%22middle%22 x%3D%22400%22 y%3D%22190%22%3E%F0%9F%8E%AA%3C%2Ftext%3E%3Ctext fill%3D%22%23888%22 font-family%3D%22Arial%22 font-size%3D%2222%22 text-anchor%3D%22middle%22 x%3D%22400%22 y%3D%22240%22%3ESmartEventa%3C%2Ftext%3E%3C%2Fsvg%3E';


// ── Favorites helpers ─────────────────────────────────────────────
async function getFavoriteIds() {
  if (!Auth.isLoggedIn()) return [];
  try {
    const data = await apiCall('/events/favorites');
    return (data.events || []).map((event) => event._id);
  } catch {
    return [];
  }
}

async function toggleFavorite(eventId, button) {
  if (!Auth.isLoggedIn()) {
    showToast?.('Please log in to save favorites.', 'info');
    setTimeout(() => { window.location.href = 'login.html'; }, 700);
    return;
  }

  const isFavorite = button.getAttribute('aria-pressed') === 'true';
  button.disabled = true;

  try {
    await apiCall(`/events/${eventId}/favorite`, {
      method: isFavorite ? 'DELETE' : 'POST',
    });

    button.setAttribute('aria-pressed', String(!isFavorite));
    button.classList.toggle('is-favorite', !isFavorite);
    button.innerHTML = !isFavorite ? '♥' : '♡';
    button.title = !isFavorite ? 'Remove from favorites' : 'Add to favorites';

    if (typeof favoriteIds !== 'undefined' && Array.isArray(favoriteIds)) {
      favoriteIds = !isFavorite
        ? Array.from(new Set([...favoriteIds, eventId]))
        : favoriteIds.filter((id) => id !== eventId);
    }

    if (typeof onFavoriteChanged === 'function') {
      onFavoriteChanged(eventId, !isFavorite);
    }

    showToast?.(
      !isFavorite ? 'Added to favorites ❤️' : 'Removed from favorites.',
      'success'
    );
  } catch (err) {
    showToast?.(err.message || 'Could not update favorite.', 'error');
  } finally {
    button.disabled = false;
  }
}

function favoriteButtonHtml(eventId, isFavorite = false) {
  return `
    <button
      type="button"
      class="favorite-btn ${isFavorite ? 'is-favorite' : ''}"
      aria-label="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
      aria-pressed="${isFavorite}"
      title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
      onclick="event.stopPropagation(); toggleFavorite('${eventId}', this)"
    >${isFavorite ? '♥' : '♡'}</button>
  `;
}
