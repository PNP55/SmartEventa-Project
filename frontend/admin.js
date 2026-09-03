/* ── Admin Dashboard JavaScript ─────────────────────────────────── */

let extractedEventData = null;
let createdEventId = null;

document.addEventListener('DOMContentLoaded', () => {
  // Auth guard — admin only
  if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }
  const user = Auth.getUser();
  if (user?.role !== 'admin') {
    showToast('Admin access required.', 'error');
    setTimeout(() => window.location.href = 'events.html', 1500);
    return;
  }

  initAdminUI(user);
  initSidebar();
  initExtraction();
  initEditForm();
  initApprove();
  loadKpiMetrics();
});

/* ── KPI Summary Metrics ────────────────────────────────────────── */
async function loadKpiMetrics() {
  try {
    const [allData, myData] = await Promise.all([
      apiCall('/events?limit=100'),
      apiCall('/events/admin/my'),
    ]);

    const events = allData.events || [];
    const myEvents = myData.events || [];

    const total = events.length;
    const upcoming = events.filter((e) => e.status === 'upcoming' || e.status === 'ongoing').length;
    const past = events.filter((e) => e.status === 'past').length;

    const totalEl = document.getElementById('kpi-total');
    const upcomingEl = document.getElementById('kpi-upcoming');
    const pastEl = document.getElementById('kpi-past');
    const myEl = document.getElementById('kpi-my');

    if (totalEl) totalEl.textContent = total;
    if (upcomingEl) upcomingEl.textContent = upcoming;
    if (pastEl) pastEl.textContent = past;
    if (myEl) myEl.textContent = myEvents.length;
  } catch (err) {
    console.error('KPI metrics error:', err);
  }
}

/* ── Admin UI ───────────────────────────────────────────────────── */
function initAdminUI(user) {
  const nameEl = document.getElementById('admin-user-name');
  const avatarEl = document.getElementById('admin-avatar');
  if (nameEl) nameEl.textContent = user.name;
  if (avatarEl) avatarEl.textContent = user.name[0].toUpperCase();

  document.getElementById('sidebar-logout')?.addEventListener('click', () => {
    Auth.clearSession();
    window.location.href = 'login.html';
  });
}

/* ── Sidebar ────────────────────────────────────────────────────── */
function initSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('admin-sidebar');
  const main = document.getElementById('admin-main');

  toggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    sidebar?.classList.toggle('hidden');
  });

  // Panel navigation
  document.querySelectorAll('.sidebar-link[data-panel]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const panel = link.dataset.panel;
      switchPanel(panel, link);
    });
  });
}

function switchPanel(panelName, clickedLink) {
  // Update active link
  document.querySelectorAll('.sidebar-link[data-panel]').forEach((l) => l.classList.remove('active'));
  clickedLink?.classList.add('active');

  // Update topbar title
  const titles = {
    'create-event': 'Create Event with AI',
    'my-events': 'My Events',
  };
  const topbarTitle = document.getElementById('topbar-title');
  if (topbarTitle) topbarTitle.textContent = titles[panelName] || 'Admin Dashboard';

  // Show/hide panels
  document.getElementById('panel-create-event').style.display = panelName === 'create-event' ? 'block' : 'none';
  const myEventsPanel = document.getElementById('panel-my-events');
  myEventsPanel.style.display = panelName === 'my-events' ? 'block' : 'none';

  if (panelName === 'my-events') {
    loadMyEvents();
  }
}

/* ── AI Extraction ──────────────────────────────────────────────── */
function initExtraction() {
  const extractBtn = document.getElementById('extract-btn');
  const manualBtn = document.getElementById('manual-btn');
  const urlInput = document.getElementById('event-url');

  extractBtn?.addEventListener('click', handleExtract);
  manualBtn?.addEventListener('click', () => {
    // Open blank edit form
    extractedEventData = {};
    populateEditForm({});
    showEditSection();
    document.getElementById('extraction-note').style.display = 'flex';
    document.getElementById('extraction-note').textContent =
      '⚠️ Manual entry mode. Please fill in the event details below.';
  });

  urlInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleExtract();
  });
}

async function handleExtract() {
  const urlInput = document.getElementById('event-url');
  const url = urlInput?.value?.trim();
  const extractBtn = document.getElementById('extract-btn');
  const btnText = document.getElementById('extract-btn-text');

  if (!url) {
    showToast('Please enter an event URL.', 'warning');
    urlInput?.focus();
    return;
  }

  if (!/^https?:\/\/.+/.test(url)) {
    showToast('Please enter a valid URL starting with http:// or https://', 'error');
    return;
  }

  // Show loading state
  extractBtn.disabled = true;
  btnText.textContent = 'Extracting...';
  showExtractionStatus();
  hideEditSection();

  // Animate steps
  const steps = [
    { id: 'step-fetch', text: '📡 Fetching webpage...', delay: 0 },
    { id: 'step-parse', text: '🔍 Parsing HTML & metadata...', delay: 1500 },
    { id: 'step-ai', text: '🤖 AI analyzing content...', delay: 3000 },
    { id: 'step-structure', text: '📊 Structuring event data...', delay: 4500 },
  ];

  // Render and animate steps
  const stepsContainer = document.getElementById('status-steps');
  stepsContainer.innerHTML = steps.map((s, i) => `
    <div class="status-step" id="${s.id}">
      ${s.text}
    </div>
  `).join('');

  steps.forEach((step, i) => {
    if (i === 0) {
      document.getElementById(step.id)?.classList.add('active');
    }
    if (i > 0) {
      setTimeout(() => {
        const prev = document.getElementById(steps[i - 1].id);
        const curr = document.getElementById(step.id);
        prev?.classList.remove('active');
        prev?.classList.add('done');
        curr?.classList.add('active');
      }, step.delay);
    }
  });

  try {
    const data = await apiCall('/ai/extract', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });

    extractedEventData = data.event;

    // Mark all steps done
    steps.forEach((step) => {
      const el = document.getElementById(step.id);
      el?.classList.remove('active');
      el?.classList.add('done');
    });

    await delay(600);

    // Show extraction note if partial
    if (data.extractionNote) {
      const noteEl = document.getElementById('extraction-note');
      noteEl.textContent = `⚠️ ${data.extractionNote}`;
      noteEl.style.display = 'flex';
    } else {
      document.getElementById('extraction-note').style.display = 'none';
    }

    // Populate and show edit form
    populateEditForm(extractedEventData);
    hideExtractionStatus();
    showEditSection();

    showToast(
      data.aiUsed
        ? '✅ Event extracted with AI assistance!'
        : '✅ Event extracted successfully!',
      'success'
    );
  } catch (err) {
    hideExtractionStatus();
    showToast(err.message || 'Extraction failed. Please try again.', 'error');

    if (err.message?.includes('manually') || err.message?.includes('Access denied')) {
      // Offer manual entry
      const noteEl = document.getElementById('extraction-note');
      noteEl.textContent = `⚠️ ${err.message} You can enter event details manually below.`;
      noteEl.style.display = 'flex';
      populateEditForm({});
      showEditSection();
    }
  } finally {
    extractBtn.disabled = false;
    btnText.textContent = 'Extract Event with AI';
  }
}

/* ── Edit Form ──────────────────────────────────────────────────── */
function populateEditForm(data) {
  setValue('edit-title', data.title || '');
  setValue('edit-description', data.description || '');
  setValue('edit-time', data.time || '');
  setValue('edit-location', data.location || '');
  setValue('edit-image', data.image || '');
  setValue('edit-source-url', data.sourceUrl || '');

  // Date — try to parse to date input format
  if (data.date) {
    const dateInput = document.getElementById('edit-date');
    if (dateInput) {
      // Convert to YYYY-MM-DD for date input
      const d = new Date(data.date);
      if (!isNaN(d.getTime())) {
        dateInput.value = d.toISOString().split('T')[0];
      } else {
        dateInput.value = data.date;
      }
    }
  }

  // Category
  const catSelect = document.getElementById('edit-category');
  if (catSelect && data.category) {
    const options = Array.from(catSelect.options).map((o) => o.value.toLowerCase());
    const matchIdx = options.findIndex((o) => o === data.category.toLowerCase());
    if (matchIdx >= 0) catSelect.selectedIndex = matchIdx;
  }

  // Update live preview
  updatePreview();
}

function initEditForm() {
  // Live preview updates
  ['edit-title', 'edit-description', 'edit-image', 'edit-category', 'edit-date', 'edit-time', 'edit-location'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', updatePreview);
    document.getElementById(id)?.addEventListener('change', updatePreview);
  });

  // Image refresh button
  document.getElementById('refresh-preview')?.addEventListener('click', updatePreview);

  // Restart button
  document.getElementById('restart-btn')?.addEventListener('click', () => {
    hideEditSection();
    document.getElementById('extraction-note').style.display = 'none';
    document.getElementById('event-url').value = '';
    document.getElementById('event-url').focus();
  });
}

function updatePreview() {
  const title = getValue('edit-title') || '—';
  const desc = getValue('edit-description') || '';
  const image = getValue('edit-image');
  const category = getValue('edit-category') || 'General';
  const date = getValue('edit-date');
  const time = getValue('edit-time');
  const location = getValue('edit-location');

  const titleEl = document.getElementById('preview-title');
  const descEl = document.getElementById('preview-desc');
  const imgEl = document.getElementById('preview-image');
  const badgeEl = document.getElementById('preview-category-badge');

  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = desc || 'No description';

  if (imgEl) {
    if (image) {
      imgEl.src = image;
      imgEl.onerror = () => { imgEl.src = PLACEHOLDER_IMAGE; imgEl.style.background = ''; };
    } else {
      imgEl.src = PLACEHOLDER_IMAGE;
    }
  }

  if (badgeEl) badgeEl.textContent = category;

  // Date
  const pmDate = document.getElementById('pm-date');
  const pmDateVal = document.getElementById('pm-date-val');
  if (date) {
    pmDate.style.display = 'flex';
    const d = new Date(date);
    pmDateVal.textContent = isNaN(d.getTime()) ? date : d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  } else {
    pmDate.style.display = 'none';
  }

  // Time
  const pmTime = document.getElementById('pm-time');
  const pmTimeVal = document.getElementById('pm-time-val');
  if (time) { pmTime.style.display = 'flex'; pmTimeVal.textContent = time; }
  else { pmTime.style.display = 'none'; }

  // Location
  const pmLocation = document.getElementById('pm-location');
  const pmLocationVal = document.getElementById('pm-location-val');
  if (location) { pmLocation.style.display = 'flex'; pmLocationVal.textContent = location; }
  else { pmLocation.style.display = 'none'; }
}

/* ── Approve & Create ───────────────────────────────────────────── */
function initApprove() {
  document.getElementById('approve-btn')?.addEventListener('click', handleApprove);
}

async function handleApprove() {
  const title = getValue('edit-title');
  if (!title?.trim()) {
    showToast('Event title is required.', 'error');
    document.getElementById('edit-title')?.focus();
    return;
  }

  const approveBtn = document.getElementById('approve-btn');
  const approveBtnText = document.getElementById('approve-btn-text');
  approveBtn.disabled = true;
  approveBtnText.textContent = 'Creating event...';

  const eventData = {
    title: getValue('edit-title'),
    description: getValue('edit-description'),
    date: getValue('edit-date'),
    time: getValue('edit-time'),
    location: getValue('edit-location'),
    category: getValue('edit-category') || 'General',
    image: getValue('edit-image'),
    sourceUrl: getValue('edit-source-url'),
  };

  try {
    const data = await apiCall('/events/create', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });

    createdEventId = data.event._id;

    // Show success modal
    const modalEventName = document.getElementById('modal-event-name');
    if (modalEventName) modalEventName.textContent = data.event.title;
    const modalViewBtn = document.getElementById('modal-view-event');
    if (modalViewBtn) modalViewBtn.href = `event-details.html?id=${data.event._id}`;

    document.getElementById('success-modal').style.display = 'flex';
  } catch (err) {
    showToast(err.message || 'Failed to create event.', 'error');
  } finally {
    approveBtn.disabled = false;
    approveBtnText.textContent = 'Approve & Create Event';
  }
}

function closeModal() {
  document.getElementById('success-modal').style.display = 'none';
  // Reset form
  hideEditSection();
  document.getElementById('event-url').value = '';
  document.getElementById('extraction-note').style.display = 'none';
  extractedEventData = null;
}

/* ── My Events ──────────────────────────────────────────────────── */
async function loadMyEvents() {
  const grid = document.getElementById('my-events-grid');
  grid.innerHTML = `<div class="events-loading"><div class="loading-spinner"></div><p>Loading your events...</p></div>`;

  try {
    const data = await apiCall('/events/admin/my');
    const events = data.events || [];

    if (events.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>No events yet</h3>
          <p>Create your first event using the AI extraction tool.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = events.map((e) => `
      <div class="my-event-row">
        <img class="my-event-thumb"
          src="${e.image || PLACEHOLDER_IMAGE}"
          alt="${e.title}"
          onerror="this.src='${PLACEHOLDER_IMAGE}'"
        />
        <div class="my-event-info">
          <div class="my-event-title">${e.title}</div>
          <div class="my-event-meta">
            <span>📅 ${e.date ? formatDateShort(e.date) : 'No date'}</span>
            <span>📍 ${e.location || 'No location'}</span>
            <span>🏷️ ${e.category || 'General'}</span>
            <span>${getStatusBadgeSmall(e.status || 'upcoming')}</span>
          </div>
        </div>
        <div class="my-event-actions">
          <button class="my-event-btn" onclick="window.open('event-details.html?id=${e._id}', '_blank')">View</button>
          <button class="my-event-btn danger" onclick="deleteEvent('${e._id}', this)">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>Failed to load events</h3><p>${err.message}</p></div>`;
  }
}

async function deleteEvent(eventId, btn) {
  if (!confirm('Are you sure you want to delete this event? This cannot be undone.')) return;

  btn.disabled = true;
  btn.textContent = '...';

  try {
    await apiCall(`/events/${eventId}`, { method: 'DELETE' });
    showToast('Event deleted.', 'success');
    loadMyEvents();
  } catch (err) {
    showToast(err.message || 'Failed to delete event.', 'error');
    btn.disabled = false;
    btn.textContent = 'Delete';
  }
}

/* ── Helpers ────────────────────────────────────────────────────── */
function showExtractionStatus() {
  document.getElementById('extraction-status').style.display = 'block';
}

function hideExtractionStatus() {
  document.getElementById('extraction-status').style.display = 'none';
}

function showEditSection() {
  document.getElementById('section-edit').style.display = 'block';
  document.getElementById('section-edit').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideEditSection() {
  document.getElementById('section-edit').style.display = 'none';
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

function getValue(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

function getStatusBadgeSmall(status) {
  const map = { upcoming: 'Upcoming', ongoing: '🟢 Live', past: 'Past' };
  return map[status] || 'Upcoming';
}

/* ── Toast ──────────────────────────────────────────────────────── */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
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
