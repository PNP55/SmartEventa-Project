/* ── Event Details JavaScript ───────────────────────────────────── */

let currentEvent = null;
let currentReview = null;
let editingReview = false;

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  updateNavAuth();
  initReviewForm();
  loadEventDetails();
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
      <button onclick="Auth.clearSession();location.reload();" class="btn-nav-cta" style="background:rgba(239,68,68,0.15);color:var(--danger);border:1px solid rgba(239,68,68,0.3);">Logout</button>
    `;
  }
}

/* ── Load Event ─────────────────────────────────────────────────── */
async function loadEventDetails() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const loading = document.getElementById('detail-loading');
  const errorEl = document.getElementById('detail-error');
  const content = document.getElementById('event-content');

  if (!id) {
    showError('No event ID specified.', loading, errorEl, content);
    return;
  }

  try {
    const data = await apiCall(`/events/${id}`);
    currentEvent = data.event;
    renderEvent(currentEvent);
    await Promise.all([loadFavoriteState(), loadReviews()]);

    loading.style.display = 'none';
    content.style.display = 'block';
  } catch (err) {
    showError(err.message || 'Event not found.', loading, errorEl, content);
  }
}

function showError(msg, loading, errorEl, content) {
  loading.style.display = 'none';
  content.style.display = 'none';
  errorEl.style.display = 'block';
  const msgEl = document.getElementById('error-message');
  if (msgEl) msgEl.textContent = msg;
}

/* ── Render Event ───────────────────────────────────────────────── */
function renderEvent(event) {
  // Page title
  document.title = `${event.title} — SmartEventa`;

  // Hero image
  const img = document.getElementById('event-image');
  if (img) {
    img.src = event.image || PLACEHOLDER_IMAGE;
    img.alt = event.title;
    img.onerror = () => { img.src = PLACEHOLDER_IMAGE; };
  }

  // Status badge
  const statusBadge = document.getElementById('event-status-badge');
  if (statusBadge) statusBadge.innerHTML = getStatusBadge(event.status || 'upcoming');

  // Category
  const catEl = document.getElementById('event-category');
  if (catEl) catEl.textContent = event.category || 'General';

  // Title
  const titleEl = document.getElementById('event-title');
  if (titleEl) titleEl.textContent = event.title;

  // Description
  const descEl = document.getElementById('event-description');
  if (descEl) descEl.textContent = event.description || 'No description available.';

  // Right panel — date
  if (event.date) {
    document.getElementById('info-date').style.display = 'flex';
    document.getElementById('detail-date').textContent = formatEventDate(event.date);
  }

  // Right panel — time
  if (event.time) {
    document.getElementById('info-time').style.display = 'flex';
    document.getElementById('detail-time').textContent = event.time;
  }

  // Right panel — location
  if (event.location) {
    document.getElementById('info-location').style.display = 'flex';
    document.getElementById('detail-location').textContent = event.location;
  }

  // Right panel — organizer
  if (event.createdBy) {
    const organizer = typeof event.createdBy === 'object' ? event.createdBy.name : 'SmartEventa Admin';
    document.getElementById('info-organizer').style.display = 'flex';
    document.getElementById('detail-organizer').textContent = organizer;
  }

  // Category in panel
  document.getElementById('detail-category').textContent = event.category || 'General';

  // Source URL
  if (event.sourceUrl) {
    const sourceSection = document.getElementById('event-source');
    const sourceLink = document.getElementById('source-link');
    if (sourceSection) sourceSection.style.display = 'block';
    if (sourceLink) {
      sourceLink.href = event.sourceUrl;
      sourceLink.textContent = `🔗 ${event.sourceUrl}`;
    }
  }
}

/* ── Favorites ──────────────────────────────────────────────────── */
async function loadFavoriteState() {
  const btn = document.getElementById('event-favorite-btn');
  if (!btn || !currentEvent) return;

  if (!Auth.isLoggedIn()) {
    btn.onclick = () => {
      showToast('Please log in to save favorites.', 'info');
      setTimeout(() => { window.location.href = 'login.html'; }, 700);
    };
    return;
  }

  try {
    const ids = await getFavoriteIds();
    setEventFavoriteButton(ids.includes(currentEvent._id));
  } catch {}
}

function setEventFavoriteButton(isFavorite) {
  const btn = document.getElementById('event-favorite-btn');
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(isFavorite));
  btn.classList.toggle('is-favorite', isFavorite);
  btn.innerHTML = isFavorite ? '♥ Remove from Favorites' : '♡ Add to Favorites';
  btn.onclick = async () => {
    btn.disabled = true;
    try {
      const nowFavorite = btn.getAttribute('aria-pressed') !== 'true';
      await apiCall(`/events/${currentEvent._id}/favorite`, { method: nowFavorite ? 'POST' : 'DELETE' });
      setEventFavoriteButton(nowFavorite);
      showToast(nowFavorite ? 'Added to favorites ❤️' : 'Removed from favorites.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not update favorites.', 'error');
    } finally {
      btn.disabled = false;
    }
  };
}

/* ── Reviews ────────────────────────────────────────────────────── */
async function loadReviews() {
  const list = document.getElementById('reviews-list');
  if (!list || !currentEvent) return;
  try {
    const data = await apiCall(`/events/${currentEvent._id}/reviews`);
    const count = data.count || 0;
    const average = data.average || 0;
    document.getElementById('review-average').textContent = average ? average.toFixed(1) : '—';
    document.getElementById('review-stars').textContent = renderStars(average);
    document.getElementById('review-count').textContent = `${count} review${count === 1 ? '' : 's'}`;

    const currentUserId = Auth.getUser()?.id;
    currentReview = currentUserId ? (data.reviews || []).find((r) => r.user?._id === currentUserId) || null : null;
    renderReviewForm();
    renderReviews(data.reviews || []);
  } catch (err) {
    list.innerHTML = `<div class="review-item"><p class="review-comment">Reviews are temporarily unavailable.</p></div>`;
  }
}

function renderReviewForm() {
  const form = document.getElementById('review-form');
  const note = document.getElementById('review-login-note');
  const title = document.getElementById('review-form-title');
  if (!form || !note) return;

  if (!Auth.isLoggedIn()) {
    form.style.display = 'none';
    note.innerHTML = '<a href="login.html" style="color:var(--primary);font-weight:700;">Log in</a> to leave a review.';
    return;
  }

  form.style.display = 'block';
  note.textContent = '';
  editingReview = !!currentReview;
  title.textContent = currentReview ? 'Your review' : 'Share your experience';

  const submit = document.getElementById('review-submit-btn');
  const cancel = document.getElementById('review-cancel-btn');
  if (currentReview) {
    document.querySelectorAll('input[name="rating"]').forEach((r) => { r.checked = Number(r.value) === currentReview.rating; });
    document.getElementById('review-comment').value = currentReview.comment || '';
    submit.textContent = 'Update Review';
    cancel.style.display = 'inline-flex';
  } else {
    document.querySelectorAll('input[name="rating"]').forEach((r) => { r.checked = false; });
    document.getElementById('review-comment').value = '';
    submit.textContent = 'Post Review';
    cancel.style.display = 'none';
  }
}

function renderReviews(reviews) {
  const list = document.getElementById('reviews-list');
  if (!list) return;
  if (!reviews.length) {
    list.innerHTML = `<div class="review-item"><p class="review-comment">Be the first to share your experience with this event.</p></div>`;
    return;
  }

  const currentUserId = Auth.getUser()?.id;
  list.innerHTML = reviews.map((review) => {
    const user = escapeHtml(review.user?.name || 'SmartEventa User');
    const own = currentUserId && review.user?._id === currentUserId;
    const date = new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return `
      <article class="review-item">
        <div class="review-item-header">
          <div>
            <div class="review-user">${user}</div>
            <div class="review-stars">${renderStars(review.rating)}</div>
          </div>
          <div class="review-date">${date}</div>
        </div>
        ${review.comment ? `<p class="review-comment">${escapeHtml(review.comment)}</p>` : ''}
        ${own ? `<div class="review-actions">
          <button type="button" class="review-action-btn" onclick="startEditReview()">Edit</button>
          <button type="button" class="review-action-btn" onclick="deleteReview()">Delete</button>
        </div>` : ''}
      </article>
    `;
  }).join('');
}

function renderStars(value) {
  const rounded = Math.round(Number(value) || 0);
  return '★★★★★'.split('').map((_, i) => i < rounded ? '★' : '☆').join('');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[char]));
}

function startEditReview() {
  if (!currentReview) return;
  renderReviewForm();
  document.getElementById('review-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function deleteReview() {
  if (!confirm('Delete your review?')) return;
  try {
    await apiCall(`/events/${currentEvent._id}/reviews/me`, { method: 'DELETE' });
    currentReview = null;
    editingReview = false;
    showToast('Review deleted.', 'success');
    await loadReviews();
  } catch (err) {
    showToast(err.message || 'Could not delete review.', 'error');
  }
}

function initReviewForm() {
  const form = document.getElementById('review-form');
  const cancel = document.getElementById('review-cancel-btn');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rating = Number(document.querySelector('input[name="rating"]:checked')?.value);
    const comment = document.getElementById('review-comment')?.value.trim() || '';
    if (!rating) {
      showToast('Please choose a star rating.', 'warning');
      return;
    }

    const btn = document.getElementById('review-submit-btn');
    btn.disabled = true;
    try {
      const method = editingReview ? 'PUT' : 'POST';
      const endpoint = editingReview
        ? `/events/${currentEvent._id}/reviews/me`
        : `/events/${currentEvent._id}/reviews`;
      await apiCall(endpoint, { method, body: JSON.stringify({ rating, comment }) });
      showToast(editingReview ? 'Review updated.' : 'Review posted. ⭐', 'success');
      currentReview = null;
      editingReview = false;
      await loadReviews();
    } catch (err) {
      showToast(err.message || 'Could not save review.', 'error');
    } finally {
      btn.disabled = false;
    }
  });
  cancel?.addEventListener('click', () => {
    editingReview = false;
    renderReviewForm();
  });
}

/* ── Share ──────────────────────────────────────────────────────── */
function shareEvent(method) {
  const url = window.location.href;
  const title = currentEvent?.title || 'Check out this event on SmartEventa AI';

  if (method === 'copy') {
    navigator.clipboard.writeText(url).then(() => {
      showToast('Link copied to clipboard!', 'success');
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

/* ── Helpers ────────────────────────────────────────────────────── */
function formatEventDate(dateStr) {
  if (!dateStr) return 'Date TBA';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
}

function getStatusBadge(status) {
  const map = { upcoming: { label: 'Upcoming', class: 'badge-upcoming' }, ongoing: { label: 'Live Now', class: 'badge-ongoing' }, past: { label: 'Past', class: 'badge-past' } };
  const s = map[status] || map['upcoming'];
  return `<span class="badge ${s.class}">${s.label}</span>`;
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
