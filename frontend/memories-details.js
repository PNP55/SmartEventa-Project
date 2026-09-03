/* ── Memories Details JavaScript ─────────────────────────────────── */

let currentMemory = null;

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  updateNavAuth();
  loadMemoryDetails();
});

function initNavbar() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  hamburger?.addEventListener('click', () => navLinks?.classList.toggle('open'));
}

function updateNavAuth() {
  const navAuth = document.getElementById('nav-auth');
  if (!navAuth) return;
  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    navAuth.innerHTML = `
      ${user?.role === 'admin' ? '<a href="admin.html" class="nav-link">Dashboard</a>' : ''}
      <a href="favorites.html" class="nav-link">Favorites</a>
      <button onclick="Auth.clearSession();location.reload();" class="btn-nav-cta" style="background:rgba(220,38,38,0.1);color:var(--danger);border:1px solid rgba(220,38,38,0.2);">Logout</button>
    `;
  }
}

async function loadMemoryDetails() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const loading = document.getElementById('detail-loading');
  const errorEl = document.getElementById('detail-error');
  const content = document.getElementById('memory-content');

  if (!id) {
    showError('No memory ID specified.', loading, errorEl, content);
    return;
  }

  try {
    const data = await apiCall(`/events/${id}`);
    currentMemory = data.event;
    renderMemory(currentMemory);

    loading.style.display = 'none';
    content.style.display = 'block';
  } catch (err) {
    showError(err.message || 'Event memory not found.', loading, errorEl, content);
  }
}

function showError(msg, loading, errorEl, content) {
  loading.style.display = 'none';
  content.style.display = 'none';
  errorEl.style.display = 'block';
  const msgEl = document.getElementById('error-message');
  if (msgEl) msgEl.textContent = msg;
}

function renderMemory(event) {
  document.title = `${event.title} — Memory Archive | SmartEventa`;

  const coverImg = event.image || PLACEHOLDER_IMAGE;

  // Hero image
  const img = document.getElementById('memory-image');
  if (img) {
    img.src = coverImg;
    img.alt = event.title;
    img.onerror = () => { img.src = PLACEHOLDER_IMAGE; };
  }

  // Gallery main image
  const galleryImg = document.getElementById('gallery-cover-img');
  if (galleryImg) {
    galleryImg.src = coverImg;
    galleryImg.onerror = () => { galleryImg.src = PLACEHOLDER_IMAGE; };
  }

  const galleryCap = document.getElementById('gallery-caption');
  if (galleryCap) galleryCap.textContent = `Official Archive Photography — ${event.title}`;

  // Category
  const catEl = document.getElementById('memory-category');
  if (catEl) catEl.textContent = event.category || 'General';

  const catVal = document.getElementById('memory-category-val');
  if (catVal) catVal.textContent = event.category || 'General';

  // Title
  const titleEl = document.getElementById('memory-title');
  if (titleEl) titleEl.textContent = event.title;

  // Description
  const descEl = document.getElementById('memory-description');
  if (descEl) descEl.textContent = event.description || 'No summary description available for this archived event.';

  // Sidebar Date
  if (event.date) {
    document.getElementById('memory-date').textContent = formatEventDate(event.date);
  }

  // Sidebar Time
  if (event.time) {
    document.getElementById('memory-time').textContent = event.time;
  } else {
    document.getElementById('memory-time').textContent = 'Concluded';
  }

  // Sidebar Location
  if (event.location) {
    document.getElementById('memory-location').textContent = event.location;
  } else {
    document.getElementById('memory-location').textContent = 'Venue TBA';
  }

  // Sidebar Organizer
  if (event.createdBy) {
    const organizer = typeof event.createdBy === 'object' ? event.createdBy.name : 'SmartEventa Admin';
    document.getElementById('memory-organizer').textContent = organizer;
  }

  // Regular details page link
  const regLink = document.getElementById('regular-details-link');
  if (regLink) regLink.href = `event-details.html?id=${event._id}`;
}

function shareMemory(method) {
  const url = window.location.href;
  const title = currentMemory?.title || 'Check out this event memory on SmartEventa';

  if (method === 'copy') {
    navigator.clipboard.writeText(url).then(() => {
      showToast('Memory link copied to clipboard! 📋', 'success');
    }).catch(() => {
      showToast('Could not copy link.', 'error');
    });
  } else if (method === 'twitter') {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  } else if (method === 'whatsapp') {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(title + '\n' + url)}`;
    window.open(waUrl, '_blank');
  }
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
