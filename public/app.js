const TIMEZONE = 'Asia/Ho_Chi_Minh';
const WORK_HOURS = 9;

const clockTimeEl = document.getElementById('clock-time');
const clockDateEl = document.getElementById('clock-date');
const statusCardEl = document.getElementById('status-card');
const statusTextEl = document.getElementById('status-text');
const goHomeCardEl = document.getElementById('go-home-card');
const goHomeTextEl = document.getElementById('go-home-text');
const goHomeSubtextEl = document.getElementById('go-home-subtext');
const streakEl = document.getElementById('streak');
const streakTextEl = document.getElementById('streak-text');
const checkinBtn = document.getElementById('checkin-btn');
const btnLabel = checkinBtn.querySelector('.btn-label');
const btnSpinner = checkinBtn.querySelector('.btn-spinner');
const historyListEl = document.getElementById('history-list');
const historyEmptyEl = document.getElementById('history-empty');
const snackbarEl = document.getElementById('snackbar');

let snackbarTimeout = null;
let isLoading = false;
let checkedInToday = false;
let todayRecord = null;

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const dateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE,
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const displayDateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE,
  weekday: 'short',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const weekRangeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE,
  month: 'short',
  day: 'numeric',
});

const shortTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function getWorkEndTime(record) {
  const checkinAt = new Date(`${record.date}T${record.checked_in_at}+07:00`);
  return new Date(checkinAt.getTime() + WORK_HOURS * 60 * 60 * 1000);
}

function formatRemaining(ms) {
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
}

function updateGoHomeUI() {
  if (!checkedInToday || !todayRecord) {
    goHomeCardEl.classList.add('hidden');
    return;
  }

  const now = new Date();
  const workEndAt = getWorkEndTime(todayRecord);
  const endTimeLabel = shortTimeFormat.format(workEndAt);
  const canGoHome = now >= workEndAt;

  goHomeCardEl.classList.remove('hidden', 'can-go-home', 'cannot-go-home');
  goHomeCardEl.classList.add(canGoHome ? 'can-go-home' : 'cannot-go-home');

  if (canGoHome) {
    goHomeTextEl.textContent = 'You can go home now';
    goHomeSubtextEl.textContent = `Work day ended at ${endTimeLabel} (check-in + ${WORK_HOURS} hours)`;
  } else {
    const remaining = formatRemaining(workEndAt - now);
    goHomeTextEl.textContent = 'Not yet — stay at work';
    goHomeSubtextEl.textContent = `You can go home at ${endTimeLabel} (${remaining} left)`;
  }
}

function updateClock() {
  const now = new Date();
  clockTimeEl.textContent = timeFormat.format(now);
  clockDateEl.textContent = dateFormat.format(now);
  updateGoHomeUI();
}

function initClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function formatDisplayDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return displayDateFormat.format(date);
}

// Returns the UTC Date for the Monday of the week containing dateStr.
function getWeekStart(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dow = (date.getUTCDay() + 6) % 7; // 0 = Monday
  date.setUTCDate(date.getUTCDate() - dow);
  return date;
}

function getWeekKey(dateStr) {
  return getWeekStart(dateStr).toISOString().slice(0, 10);
}

function formatWeekLabel(dateStr) {
  const start = getWeekStart(dateStr);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  return `${weekRangeFormat.format(start)} – ${weekRangeFormat.format(end)}`;
}

function showSnackbar(message, type = 'success') {
  if (snackbarTimeout) {
    clearTimeout(snackbarTimeout);
  }

  snackbarEl.textContent = message;
  snackbarEl.className = `snackbar show ${type}`;

  snackbarTimeout = setTimeout(() => {
    snackbarEl.classList.remove('show');
  }, 3000);
}

function createRipple(event) {
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = (event.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2;
  const y = (event.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2;

  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  button.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

function setButtonLoading(loading) {
  isLoading = loading;
  checkinBtn.classList.toggle('loading', loading);
  btnSpinner.classList.toggle('hidden', !loading);
  updateButtonState();
}

function updateButtonState() {
  if (isLoading) {
    checkinBtn.disabled = true;
    btnLabel.textContent = 'Checking in...';
    return;
  }

  if (checkedInToday) {
    checkinBtn.disabled = true;
    btnLabel.textContent = 'Checked In Today';
  } else {
    checkinBtn.disabled = false;
    btnLabel.textContent = 'Check In';
  }
}

function updateStatusUI(status) {
  checkedInToday = status.checkedInToday;
  todayRecord = status.todayRecord ?? null;

  if (status.checkedInToday && status.todayRecord) {
    statusCardEl.classList.remove('hidden');
    statusTextEl.textContent = `Checked in today at ${status.todayRecord.checked_in_at}`;
  } else {
    statusCardEl.classList.add('hidden');
  }

  updateGoHomeUI();

  if (status.streak > 0) {
    streakEl.classList.remove('hidden');
    const label = status.streak === 1 ? 'day' : 'days';
    streakTextEl.textContent = `${status.streak} ${label} streak`;
  } else {
    streakEl.classList.add('hidden');
  }

  updateButtonState();
}

function renderHistory(checkins) {
  historyListEl.innerHTML = '';

  if (!checkins.length) {
    historyEmptyEl.classList.remove('hidden');
    return;
  }

  historyEmptyEl.classList.add('hidden');

  let currentWeekKey = null;

  checkins.forEach((item, index) => {
    const weekKey = getWeekKey(item.date);
    if (weekKey !== currentWeekKey) {
      currentWeekKey = weekKey;
      const weekHeader = document.createElement('h3');
      weekHeader.className = 'history-week-header';
      weekHeader.setAttribute('role', 'presentation');
      weekHeader.textContent = formatWeekLabel(item.date);
      historyListEl.appendChild(weekHeader);
    }

    const card = document.createElement('article');
    card.className = 'history-item fade-in';
    card.style.animationDelay = `${index * 0.05}s`;
    card.setAttribute('role', 'listitem');

    const content = document.createElement('div');
    content.className = 'history-item-content';

    const dateEl = document.createElement('span');
    dateEl.className = 'history-date';
    dateEl.textContent = formatDisplayDate(item.date);

    const timeEl = document.createElement('span');
    timeEl.className = 'history-time';
    timeEl.textContent = item.checked_in_at;

    content.append(dateEl, timeEl);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'history-delete-btn';
    deleteBtn.setAttribute('aria-label', `Delete check-in on ${formatDisplayDate(item.date)}`);
    deleteBtn.dataset.date = item.date;
    deleteBtn.innerHTML = '&times;';

    card.append(content, deleteBtn);
    historyListEl.appendChild(card);
  });
}

async function handleDelete(date) {
  try {
    const res = await fetch(`/api/checkins/${encodeURIComponent(date)}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showSnackbar(data.message || 'Failed to delete check-in.', 'error');
      return;
    }

    showSnackbar('Check-in removed.', 'success');
    await Promise.all([fetchStatus(), fetchHistory()]);
  } catch {
    showSnackbar('Something went wrong. Please try again.', 'error');
  }
}

async function fetchStatus() {
  const res = await fetch('/api/status');
  if (!res.ok) {
    throw new Error('Failed to load status');
  }
  const status = await res.json();
  updateStatusUI(status);
  return status;
}

async function fetchHistory() {
  const res = await fetch('/api/checkins');
  if (!res.ok) {
    throw new Error('Failed to load history');
  }
  const checkins = await res.json();
  renderHistory(checkins);
  return checkins;
}

async function handleCheckin() {
  if (checkedInToday || isLoading) {
    return;
  }

  setButtonLoading(true);

  try {
    const res = await fetch('/api/checkin', { method: 'POST' });

    if (res.status === 409) {
      const data = await res.json();
      showSnackbar(data.message || 'Already checked in today.', 'error');
      await fetchStatus();
      return;
    }

    if (!res.ok) {
      throw new Error('Check-in failed');
    }

    showSnackbar('Check-in successful!', 'success');
    await Promise.all([fetchStatus(), fetchHistory()]);
  } catch {
    showSnackbar('Something went wrong. Please try again.', 'error');
    updateButtonState();
  } finally {
    setButtonLoading(false);
  }
}

async function init() {
  initClock();

  checkinBtn.addEventListener('click', handleCheckin);
  checkinBtn.addEventListener('mousedown', createRipple);
  checkinBtn.addEventListener('touchstart', createRipple, { passive: true });

  historyListEl.addEventListener('click', (event) => {
    const deleteBtn = event.target.closest('.history-delete-btn');
    if (!deleteBtn) {
      return;
    }
    handleDelete(deleteBtn.dataset.date);
  });

  try {
    await Promise.all([fetchStatus(), fetchHistory()]);
  } catch {
    showSnackbar('Failed to load data. Please refresh.', 'error');
  }
}

init();
