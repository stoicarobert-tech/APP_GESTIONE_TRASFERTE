const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const STORAGE_KEY = 'zwei-data-v1';
const PROFILES_KEY = 'focus-profiles-v1';
const categories = {
  lavoro: { label: 'Lavoro', color: '#79a8bf', icon: '▣' },
  palestra: { label: 'Palestra', color: '#ef765e', icon: '◆' },
  gaming: { label: 'Gaming', color: '#a69bd9', icon: '♟' },
  altro: { label: 'Altro', color: '#e6bd54', icon: '●' }
};

const todayISO = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};
const shiftDate = days => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const starterData = {
  activities: [
    { id: uid(), title: 'Lavoro', date: todayISO(), start: '09:00', end: '17:00', category: 'lavoro', notes: 'Esempio: tocca la matita per modificarlo' },
    { id: uid(), title: 'Allenamento', date: todayISO(), start: '18:30', end: '19:45', category: 'palestra', notes: 'Esempio' },
    { id: uid(), title: 'Serata gaming', date: shiftDate(1), start: '21:00', end: '23:00', category: 'gaming', notes: 'Esempio' }
  ],
  inventory: [
    { id: uid(), name: 'Latte', quantity: '1 bottiglia', location: 'Frigo', expiry: shiftDate(2), notes: 'Dato di esempio' },
    { id: uid(), name: 'Pasta', quantity: '3 pacchi', location: 'Dispensa', expiry: '', notes: 'Dato di esempio' },
    { id: uid(), name: 'Verdure miste', quantity: '1 busta', location: 'Freezer', expiry: shiftDate(30), notes: 'Dato di esempio' }
  ],
  settings: { weeklyGoal: 40, theme: 'light', journeyStart: '' }
};

let profiles = loadProfiles();
let state = loadState();
let selectedActivityFilter = 'all';
let selectedPhotoFilter = 'all';
let selectedAgendaDate = null;
let pendingPhoto = null;
let installPrompt = null;
let toastTimer;

function loadProfiles() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILES_KEY));
    if (saved?.current && Array.isArray(saved.accounts) && saved.accounts.length) return saved;
  } catch (_) { /* create the local default profile */ }
  const defaults = { current: 'default', accounts: [{ id: 'default', name: 'Profilo principale' }] };
  localStorage.setItem(PROFILES_KEY, JSON.stringify(defaults));
  return defaults;
}

function currentProfileId() {
  return profiles.current || 'default';
}

function profileDataKey() {
  return currentProfileId() === 'default' ? STORAGE_KEY : `focus-data-v1-${currentProfileId()}`;
}

function emptyProfileData() {
  return { activities: [], inventory: [], settings: { weeklyGoal: 40, theme: 'light', journeyStart: '' } };
}

function loadState() {
  const key = profileDataKey();
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved?.activities && saved?.inventory) return saved;
  } catch (_) { /* create a clean profile */ }
  const initial = currentProfileId() === 'default' ? structuredClone(starterData) : emptyProfileData();
  localStorage.setItem(key, JSON.stringify(initial));
  return initial;
}

function saveState() {
  localStorage.setItem(profileDataKey(), JSON.stringify(state));
  renderAll();
}

function saveProfiles() {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

function profileInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2) || 'TU').toUpperCase();
}

function durationHours(activity) {
  const [sh, sm] = activity.start.split(':').map(Number);
  const [eh, em] = activity.end.split(':').map(Number);
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60;
  return minutes / 60;
}

function formatHours(value) {
  if (!value) return '0h';
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  if (!minutes) return `${hours}h`;
  if (!hours) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function parseLocalDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(iso, style = 'long') {
  const options = style === 'long'
    ? { weekday: 'long', day: 'numeric', month: 'long' }
    : { day: 'numeric', month: 'short' };
  return new Intl.DateTimeFormat('it-IT', options).format(parseLocalDate(iso));
}

function dateDiff(iso) {
  const a = parseLocalDate(todayISO());
  const b = parseLocalDate(iso);
  return Math.ceil((b - a) / 86400000);
}

function isInRange(iso, range) {
  if (range === 'all') return true;
  const date = parseLocalDate(iso);
  const now = new Date();
  if (range === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  const day = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 7);
  return date >= monday && date < sunday;
}

function weekHours() {
  return state.activities.filter(a => isInRange(a.date, 'week')).reduce((sum, a) => sum + durationHours(a), 0);
}

function escapeHTML(value = '') {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function categoryStyle(category) {
  return `--accent:${categories[category]?.color || categories.altro.color}`;
}

function emptyState(icon, title, text) {
  return `<div class="empty-state"><span>${icon}</span><strong>${title}</strong><small>${text}</small></div>`;
}

function renderHeader() {
  const now = new Date();
  $('#today-label').textContent = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(now).toUpperCase();
  const hour = now.getHours();
  const profile = profiles.accounts.find(account => account.id === currentProfileId());
  const firstName = currentProfileId() === 'default' ? '' : profile?.name?.split(/\s+/)[0] || '';
  $('#page-title').textContent = `${hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera'}${firstName ? `, ${firstName}` : ''}!`;
  const todayItems = state.activities.filter(a => a.date === todayISO());
  const total = todayItems.reduce((sum, item) => sum + durationHours(item), 0);
  $('#hero-summary').textContent = todayItems.length
    ? `${todayItems.length} ${todayItems.length === 1 ? 'impegno' : 'impegni'} · ${formatHours(total)} pianificate.`
    : 'Hai una giornata tutta da organizzare.';
}

function renderTrip() {
  const trip = state.settings.trip;
  const card = $('#trip-countdown-card');
  if (!trip?.destination || !trip?.startDate || !trip?.endDate) {
    card.classList.remove('configured');
    $('#sidebar-trip-flag').textContent = '🌍'; $('#sidebar-trip-name').textContent = 'La tua trasferta'; $('#journey-days').textContent = 'Tocca per configurare';
    $('#trip-countdown-flag').textContent = '🌍'; $('#trip-destination').textContent = 'Imposta destinazione e date'; $('#trip-dates').textContent = 'Tocca qui per iniziare il countdown';
    $('#trip-countdown').textContent = '—'; $('#trip-countdown-label').textContent = 'giorni'; $('#trip-progress-bar').style.width = '0%';
    return;
  }

  card.classList.add('configured');
  const startIn = dateDiff(trip.startDate);
  const endIn = dateDiff(trip.endDate);
  const totalDays = Math.max(1, Math.round((parseLocalDate(trip.endDate) - parseLocalDate(trip.startDate)) / 86400000));
  const elapsedDays = Math.min(totalDays, Math.max(0, Math.round((parseLocalDate(todayISO()) - parseLocalDate(trip.startDate)) / 86400000)));
  const progress = startIn > 0 ? 0 : endIn < 0 ? 100 : Math.round(elapsedDays / totalDays * 100);
  let count; let label; let sidebarStatus;
  if (startIn > 0) {
    count = startIn; label = startIn === 1 ? 'giorno alla partenza' : 'giorni alla partenza'; sidebarStatus = `Partenza tra ${startIn} ${startIn === 1 ? 'giorno' : 'giorni'}`;
  } else if (endIn > 0) {
    count = endIn; label = endIn === 1 ? 'giorno rimanente' : 'giorni rimanenti'; sidebarStatus = `${endIn} ${endIn === 1 ? 'giorno rimanente' : 'giorni rimanenti'}`;
  } else if (endIn === 0) {
    count = 0; label = 'ultimo giorno'; sidebarStatus = 'Ultimo giorno';
  } else {
    count = 0; label = 'trasferta conclusa'; sidebarStatus = 'Trasferta conclusa';
  }

  const flag = trip.flag || '🌍';
  $('#sidebar-trip-flag').textContent = flag; $('#sidebar-trip-name').textContent = trip.destination; $('#journey-days').textContent = sidebarStatus;
  $('#trip-countdown-flag').textContent = flag; $('#trip-destination').textContent = trip.destination;
  $('#trip-dates').textContent = `${formatDate(trip.startDate, 'short')} — ${formatDate(trip.endDate, 'short')}`;
  $('#trip-countdown').textContent = count; $('#trip-countdown-label').textContent = label; $('#trip-progress-bar').style.width = `${progress}%`;
  card.setAttribute('aria-label', `Trasferta a ${trip.destination}: ${sidebarStatus}. Tocca per modificare`);
}

function renderProfiles() {
  const current = profiles.accounts.find(account => account.id === currentProfileId()) || profiles.accounts[0];
  const avatar = $('.avatar');
  avatar.textContent = currentProfileId() === 'default' ? 'TU' : profileInitials(current?.name);
  avatar.title = current?.name || 'Profilo';
  $('#profile-list').innerHTML = profiles.accounts.map(account => `<div class="profile-row">
    <button type="button" class="profile-option ${account.id === currentProfileId() ? 'active' : ''}" data-switch-profile="${account.id}">
      <span class="profile-initials">${profileInitials(account.name)}</span><div><strong>${escapeHTML(account.name)}</strong><small>${account.id === currentProfileId() ? 'Profilo attivo' : 'Tocca per accedere'}</small></div>${account.id === currentProfileId() ? '<span class="profile-check">✓</span>' : ''}
    </button>
    ${account.id !== 'default' ? `<button type="button" class="profile-delete" data-delete-profile="${account.id}" aria-label="Elimina profilo ${escapeHTML(account.name)}">×</button>` : ''}
  </div>`).join('');
}

function renderStats() {
  const range = $('#stats-range').value;
  const tracked = ['lavoro', 'palestra', 'gaming'];
  const html = tracked.map(category => {
    const info = categories[category];
    const items = state.activities.filter(a => a.category === category && isInRange(a.date, range));
    const hours = items.reduce((sum, a) => sum + durationHours(a), 0);
    return `<article class="stat-card" style="--accent:${info.color}">
      <div class="stat-head"><span class="stat-icon">${info.icon}</span><small>${items.length} attività</small></div>
      <h3>${formatHours(hours)}</h3><p>${info.label}</p>
    </article>`;
  }).join('');
  $('#stats-grid').innerHTML = html;

  const weekly = weekHours();
  const goal = Number(state.settings.weeklyGoal) || 40;
  const percent = Math.min(100, Math.round(weekly / goal * 100));
  $('#week-hours').textContent = formatHours(weekly);
  $('#ring-percent').textContent = `${percent}%`;
  $('#progress-ring').style.setProperty('--p', percent);
  $('#week-goal-label').textContent = `di ${goal} ore`;
}

function renderToday() {
  const items = state.activities.filter(a => a.date === todayISO()).sort((a, b) => a.start.localeCompare(b.start));
  $('#today-list').innerHTML = items.length ? items.map(item => `<div class="timeline-item" style="${categoryStyle(item.category)}">
    <span class="timeline-time">${item.start}</span><span class="timeline-dot"></span>
    <div class="timeline-text"><strong>${escapeHTML(item.title)}</strong><small>${categories[item.category]?.label || 'Altro'}${item.notes ? ` · ${escapeHTML(item.notes)}` : ''}</small></div>
    <span class="duration-badge">${formatHours(durationHours(item))}</span>
  </div>`).join('') : emptyState('◷', 'Nessun impegno oggi', 'Aggiungi la prima attività della giornata');

  const expiring = state.inventory.filter(i => i.expiry && dateDiff(i.expiry) >= 0).sort((a, b) => a.expiry.localeCompare(b.expiry)).slice(0, 4);
  $('#expiring-list').innerHTML = expiring.length ? expiring.map(item => {
    const days = dateDiff(item.expiry);
    return `<div class="compact-item"><span class="compact-icon">${locationIcon(item.location)}</span><div><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.quantity)} · ${escapeHTML(item.location)}</small></div><span class="expiry-badge">${days === 0 ? 'Oggi' : days === 1 ? 'Domani' : `${days} gg`}</span></div>`;
  }).join('') : emptyState('✓', 'Tutto sotto controllo', 'Nessuna scadenza vicina');
}

function renderWeekStrip() {
  const now = new Date();
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  $('#week-strip').innerHTML = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday); date.setDate(monday.getDate() + index);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    const iso = date.toISOString().slice(0, 10);
    const active = selectedAgendaDate ? iso === selectedAgendaDate : iso === todayISO();
    return `<button class="day-card ${active ? 'active' : ''}" data-date="${iso}"><small>${new Intl.DateTimeFormat('it-IT', { weekday: 'short' }).format(date)}</small><strong>${date.getDate()}</strong></button>`;
  }).join('');
}

function renderAgenda() {
  renderWeekStrip();
  let items = [...state.activities].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  if (selectedActivityFilter !== 'all') items = items.filter(a => a.category === selectedActivityFilter);
  if (selectedAgendaDate) items = items.filter(a => a.date === selectedAgendaDate);
  const groups = Object.groupBy ? Object.groupBy(items, a => a.date) : items.reduce((acc, a) => ((acc[a.date] ||= []).push(a), acc), {});
  const entries = Object.entries(groups);
  $('#agenda-list').innerHTML = entries.length ? entries.map(([date, activities]) => `<section class="agenda-day">
    <div class="agenda-date"><h3>${formatDate(date)}</h3><small>${activities.length} ${activities.length === 1 ? 'impegno' : 'impegni'}</small></div>
    ${activities.map(item => `<div class="agenda-entry" style="${categoryStyle(item.category)}">
      <span class="agenda-entry-time">${item.start} — ${item.end}</span><span class="agenda-entry-bar"></span>
      <div class="agenda-entry-body"><strong>${escapeHTML(item.title)}</strong><small>${categories[item.category]?.label || 'Altro'} · ${formatHours(durationHours(item))}${item.notes ? ` · ${escapeHTML(item.notes)}` : ''}</small></div>
      <span class="entry-actions"><button class="mini-action" data-edit-activity="${item.id}" aria-label="Modifica">✎</button><button class="mini-action" data-delete-activity="${item.id}" aria-label="Elimina">×</button></span>
    </div>`).join('')}
  </section>`).join('') : emptyState('◷', 'Agenda libera', 'Aggiungi un’attività o cambia filtro');
}

function locationIcon(location) {
  return ({ Frigo: '❄', Freezer: '✦', Dispensa: '▤', Bagno: '◌', Altro: '□' })[location] || '□';
}

function expiryText(expiry) {
  if (!expiry) return { text: 'Nessuna scadenza', soon: false };
  const days = dateDiff(expiry);
  if (days < 0) return { text: `Scaduto da ${Math.abs(days)} gg`, soon: true };
  if (days === 0) return { text: 'Scade oggi', soon: true };
  if (days === 1) return { text: 'Scade domani', soon: true };
  if (days <= 7) return { text: `Scade tra ${days} gg`, soon: true };
  return { text: formatDate(expiry, 'short'), soon: false };
}

function renderInventory() {
  const search = $('#inventory-search').value.trim().toLowerCase();
  const location = $('#inventory-location').value;
  const locations = ['Frigo', 'Freezer', 'Dispensa', 'Altro'];
  $('#inventory-overview').innerHTML = locations.map(place => `<div class="overview-card"><span>${place}</span><strong>${state.inventory.filter(i => place === 'Altro' ? !['Frigo', 'Freezer', 'Dispensa'].includes(i.location) : i.location === place).length}</strong></div>`).join('');
  const items = state.inventory.filter(item => (!search || item.name.toLowerCase().includes(search)) && (location === 'all' || item.location === location));
  $('#inventory-grid').innerHTML = items.length ? items.map(item => {
    const expiry = expiryText(item.expiry);
    return `<article class="inventory-card">
      <div class="inventory-card-top"><span class="location-icon">${locationIcon(item.location)}</span><button class="card-menu" data-edit-item="${item.id}" aria-label="Modifica">•••</button></div>
      <h3>${escapeHTML(item.name)}</h3><p>${escapeHTML(item.notes || item.location)}</p>
      <div class="inventory-card-footer"><div><small>Quantità</small><strong>${escapeHTML(item.quantity)}</strong></div><span class="expiry-pill ${expiry.soon ? 'soon' : ''}">${expiry.text}</span></div>
      <button class="mini-action" data-delete-item="${item.id}" aria-label="Elimina prodotto" style="position:absolute;right:13px;bottom:13px">×</button>
    </article>`;
  }).join('') : emptyState('▦', 'Inventario vuoto', 'Aggiungi ciò che hai in casa');
}

async function openPhotoDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('zwei-photos', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('photos', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function photoStore(mode, payload) {
  const db = await openPhotoDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('photos', mode === 'getAll' ? 'readonly' : 'readwrite');
    const store = transaction.objectStore('photos');
    const request = mode === 'put' ? store.put(payload) : mode === 'delete' ? store.delete(payload) : store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function renderPhotos() {
  let photos = await photoStore('getAll');
  photos = photos.filter(photo => photo.owner ? photo.owner === currentProfileId() : currentProfileId() === 'default');
  photos.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  if (selectedPhotoFilter !== 'all') photos = photos.filter(p => p.type === selectedPhotoFilter);
  $('#photo-grid').innerHTML = photos.length ? photos.map(photo => `<article class="photo-card">
    <img src="${photo.data}" alt="${escapeHTML(photo.caption || photo.type)}" />
    <span class="photo-type">${escapeHTML(photo.type)}</span><button class="photo-delete" data-delete-photo="${photo.id}" aria-label="Elimina foto">×</button>
    <div class="photo-overlay"><strong>${escapeHTML(photo.caption || (photo.type === 'frigo' ? 'Il mio frigo' : photo.type === 'spesa' ? 'La mia spesa' : 'Ricordo'))}</strong><small>${formatDate(photo.date)}</small></div>
  </article>`).join('') : emptyState('◎', 'Nessuna foto', 'Crea una memoria visiva del frigo e della spesa');
}

function renderAll() {
  renderHeader(); renderTrip(); renderProfiles(); renderStats(); renderToday(); renderAgenda(); renderInventory(); renderPhotos();
  document.body.classList.toggle('dark', state.settings.theme === 'dark');
  $('#theme-button').textContent = state.settings.theme === 'dark' ? '☾' : '☼';
}

function showToast(message) {
  const toast = $('#toast');
  clearTimeout(toastTimer); toast.textContent = message; toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function showView(view) {
  $$('.view').forEach(el => el.classList.toggle('active', el.id === `view-${view}`));
  $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  history.replaceState(null, '', `#${view}`);
}

function openDialog(type, data = null) {
  const dialog = $(`#${type}-dialog`);
  const form = $(`#${type}-form`);
  form.reset();
  if (type === 'activity') {
    form.elements.date.value = todayISO(); form.elements.start.value = '09:00'; form.elements.end.value = '10:00';
    if (data) Object.keys(data).forEach(key => form.elements[key] && (form.elements[key].value = data[key]));
  }
  if (type === 'item' && data) Object.keys(data).forEach(key => form.elements[key] && (form.elements[key].value = data[key]));
  if (type === 'photo') {
    pendingPhoto = null; form.elements.date.value = todayISO(); $('#photo-preview').hidden = true; $('#file-prompt').hidden = false;
  }
  if (type === 'profile') renderProfiles();
  if (type === 'trip') {
    const trip = state.settings.trip || {};
    form.elements.destination.value = trip.destination || '';
    form.elements.flag.value = trip.flag || '🌍';
    form.elements.startDate.value = trip.startDate || todayISO();
    form.elements.endDate.value = trip.endDate || shiftDate(7);
  }
  dialog.showModal();
}

async function compressImage(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (_) {
    bitmap = await new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Formato non supportato')); };
      image.src = url;
    });
  }
  const max = 1400;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', .82);
}

function bindEvents() {
  document.addEventListener('click', async event => {
    const viewButton = event.target.closest('[data-view], [data-go]');
    if (viewButton) showView(viewButton.dataset.view || viewButton.dataset.go);
    const openButton = event.target.closest('[data-open]');
    if (openButton) openDialog(openButton.dataset.open);
    const close = event.target.closest('.modal-close');
    if (close) close.closest('dialog').close();

    const editActivity = event.target.closest('[data-edit-activity]');
    if (editActivity) openDialog('activity', state.activities.find(a => a.id === editActivity.dataset.editActivity));
    const deleteActivity = event.target.closest('[data-delete-activity]');
    if (deleteActivity && confirm('Eliminare questa attività?')) {
      state.activities = state.activities.filter(a => a.id !== deleteActivity.dataset.deleteActivity); saveState(); showToast('Attività eliminata');
    }
    const editItem = event.target.closest('[data-edit-item]');
    if (editItem) openDialog('item', state.inventory.find(i => i.id === editItem.dataset.editItem));
    const deleteItem = event.target.closest('[data-delete-item]');
    if (deleteItem && confirm('Eliminare questo prodotto?')) {
      state.inventory = state.inventory.filter(i => i.id !== deleteItem.dataset.deleteItem); saveState(); showToast('Prodotto eliminato');
    }
    const deletePhoto = event.target.closest('[data-delete-photo]');
    if (deletePhoto && confirm('Eliminare questa foto?')) {
      await photoStore('delete', deletePhoto.dataset.deletePhoto); renderPhotos(); showToast('Foto eliminata');
    }
    const switchProfile = event.target.closest('[data-switch-profile]');
    if (switchProfile && switchProfile.dataset.switchProfile !== currentProfileId()) {
      profiles.current = switchProfile.dataset.switchProfile;
      saveProfiles(); state = loadState();
      switchProfile.closest('dialog')?.close(); renderAll(); showToast('Profilo cambiato');
    }
    const deleteProfile = event.target.closest('[data-delete-profile]');
    if (deleteProfile) {
      const profileId = deleteProfile.dataset.deleteProfile;
      const account = profiles.accounts.find(item => item.id === profileId);
      if (account && confirm(`Eliminare il profilo "${account.name}" e tutti i suoi dati?`)) {
        profiles.accounts = profiles.accounts.filter(item => item.id !== profileId);
        if (currentProfileId() === profileId) profiles.current = 'default';
        localStorage.removeItem(`focus-data-v1-${profileId}`); saveProfiles();
        const profilePhotos = (await photoStore('getAll')).filter(photo => photo.owner === profileId);
        await Promise.all(profilePhotos.map(photo => photoStore('delete', photo.id)));
        state = loadState(); renderAll(); showToast('Profilo eliminato');
      }
    }
    const day = event.target.closest('[data-date]');
    if (day) { selectedAgendaDate = selectedAgendaDate === day.dataset.date ? null : day.dataset.date; renderAgenda(); }
  });

  $$('#activity-filters .chip').forEach(button => button.addEventListener('click', () => {
    selectedActivityFilter = button.dataset.filter; $$('#activity-filters .chip').forEach(b => b.classList.toggle('active', b === button)); renderAgenda();
  }));
  $$('#photo-filters .chip').forEach(button => button.addEventListener('click', () => {
    selectedPhotoFilter = button.dataset.filter; $$('#photo-filters .chip').forEach(b => b.classList.toggle('active', b === button)); renderPhotos();
  }));
  $('#stats-range').addEventListener('change', renderStats);
  $('#inventory-search').addEventListener('input', renderInventory);
  $('#inventory-location').addEventListener('change', renderInventory);

  $('#activity-form').addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    if (data.start === data.end) return showToast('Inizio e fine non possono coincidere');
    if (data.id) state.activities = state.activities.map(a => a.id === data.id ? data : a);
    else state.activities.push({ ...data, id: uid() });
    event.target.closest('dialog').close(); saveState(); showToast(data.id ? 'Attività aggiornata' : 'Attività aggiunta');
  });

  $('#item-form').addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    if (data.id) state.inventory = state.inventory.map(i => i.id === data.id ? data : i);
    else state.inventory.push({ ...data, id: uid() });
    event.target.closest('dialog').close(); saveState(); showToast(data.id ? 'Prodotto aggiornato' : 'Prodotto aggiunto');
  });

  $('#trip-form').addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    if (data.endDate < data.startDate) return showToast('La data di fine deve essere successiva all’inizio');
    state.settings.trip = data;
    event.target.closest('dialog').close(); saveState(); showToast('Trasferta e countdown aggiornati');
  });

  $('#profile-form').addEventListener('submit', event => {
    event.preventDefault();
    const username = new FormData(event.target).get('username').trim().replace(/\s+/g, ' ');
    if (username.length < 2) return showToast('Inserisci almeno 2 caratteri');
    const existing = profiles.accounts.find(account => account.name.toLowerCase() === username.toLowerCase());
    if (existing) {
      profiles.current = existing.id;
    } else {
      const id = `${username.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'profilo'}-${uid().slice(-4)}`;
      profiles.accounts.push({ id, name: username }); profiles.current = id;
    }
    saveProfiles(); state = loadState();
    event.target.closest('dialog').close(); event.target.reset(); renderAll(); showToast(`Accesso come ${username}`);
  });

  $('#photo-input').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      pendingPhoto = await compressImage(file); $('#photo-preview').src = pendingPhoto; $('#photo-preview').hidden = false; $('#file-prompt').hidden = true;
    } catch (_) { showToast('Non riesco a leggere questa immagine'); }
  });

  $('#photo-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!pendingPhoto) return showToast('Scegli prima una foto');
    const data = Object.fromEntries(new FormData(event.target)); delete data.photo;
    await photoStore('put', { ...data, id: uid(), owner: currentProfileId(), data: pendingPhoto, createdAt: Date.now() });
    event.target.closest('dialog').close(); renderPhotos(); showToast('Foto salvata sul dispositivo');
  });

  $('#goal-button').addEventListener('click', () => { $('#goal-form').elements.goal.value = state.settings.weeklyGoal; $('#goal-dialog').showModal(); });
  $('#goal-form').addEventListener('submit', event => {
    event.preventDefault(); state.settings.weeklyGoal = Number(new FormData(event.target).get('goal')); event.target.closest('dialog').close(); saveState(); showToast('Obiettivo aggiornato');
  });
  $('#theme-button').addEventListener('click', () => { state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark'; saveState(); });

  $('#export-button').addEventListener('click', async () => {
    const allPhotos = await photoStore('getAll');
    const photos = allPhotos.filter(photo => photo.owner ? photo.owner === currentProfileId() : currentProfileId() === 'default');
    const account = profiles.accounts.find(item => item.id === currentProfileId());
    const blob = new Blob([JSON.stringify({ account, ...state, photos, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `focus-backup-${todayISO()}.json`; link.click(); URL.revokeObjectURL(link.href); showToast('Backup esportato');
  });

  const installButtons = [$('#install-button'), $('#install-button-mobile')];
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (isIOS && !isStandalone) $('#install-button-mobile').hidden = false;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event; installButtons.forEach(button => button.hidden = false);
  });
  installButtons.forEach(button => button.addEventListener('click', async () => {
    if (!installPrompt) return showToast('Su iPhone: Condividi → Aggiungi alla schermata Home');
    installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; installButtons.forEach(item => item.hidden = true);
  }));
}

async function init() {
  bindEvents();
  const initialView = location.hash.slice(1);
  if (['oggi', 'agenda', 'inventario', 'foto'].includes(initialView)) showView(initialView);
  renderAll();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js?v=9').catch(() => {});
}

init();
