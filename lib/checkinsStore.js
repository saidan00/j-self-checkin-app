const fs = require('fs/promises');
const path = require('path');

const TIMEZONE = 'Asia/Ho_Chi_Minh';
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'checkins.json');
const TEMP_FILE = path.join(DATA_DIR, 'checkins.json.tmp');

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function getHoChiMinhDateString(date = new Date()) {
  return dateFormatter.format(date);
}

function getHoChiMinhTimeString(date = new Date()) {
  return timeFormatter.format(date);
}

function parseDateString(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(dateStr, days) {
  const date = parseDateString(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]\n', 'utf8');
  }
}

async function readCheckins() {
  await ensureDataFile();
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      console.error('checkins.json is not an array, resetting to []');
      return [];
    }
    return data;
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error('checkins.json is corrupt, returning empty array:', err.message);
      return [];
    }
    throw err;
  }
}

async function writeCheckins(records) {
  await ensureDataFile();
  const content = JSON.stringify(records, null, 2) + '\n';
  await fs.writeFile(TEMP_FILE, content, 'utf8');
  await fs.rename(TEMP_FILE, DATA_FILE);
}

function sortCheckins(records) {
  return [...records].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.checked_in_at.localeCompare(a.checked_in_at);
  });
}

async function getTodayCheckin() {
  const today = getHoChiMinhDateString();
  const records = await readCheckins();
  return records.find((r) => r.date === today) || null;
}

async function addCheckin() {
  const today = getHoChiMinhDateString();
  const now = getHoChiMinhTimeString();
  const records = await readCheckins();

  const existing = records.find((r) => r.date === today);
  if (existing) {
    return {
      ok: false,
      error: 'already_checked_in',
      message: 'You have already checked in today.',
      record: existing,
    };
  }

  const record = { date: today, checked_in_at: now };
  records.push(record);
  await writeCheckins(records);

  return { ok: true, record };
}

async function listCheckins() {
  const records = await readCheckins();
  return sortCheckins(records);
}

function calculateStreak(records) {
  if (records.length === 0) {
    return 0;
  }

  const dates = [...new Set(records.map((r) => r.date))].sort((a, b) => b.localeCompare(a));
  const today = getHoChiMinhDateString();

  let streak = 0;
  let expected = today;

  if (!dates.includes(today)) {
    expected = addDays(today, -1);
  }

  for (const date of dates) {
    if (date === expected) {
      streak += 1;
      expected = addDays(expected, -1);
    } else if (date < expected) {
      break;
    }
  }

  return streak;
}

async function getStatus() {
  const records = await readCheckins();
  const todayRecord = records.find((r) => r.date === getHoChiMinhDateString()) || null;

  return {
    checkedInToday: Boolean(todayRecord),
    todayRecord,
    streak: calculateStreak(records),
  };
}

function isValidDateString(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

async function deleteCheckin(date) {
  if (!isValidDateString(date)) {
    return { ok: false, error: 'invalid_date', message: 'Invalid date format.' };
  }

  const records = await readCheckins();
  const index = records.findIndex((r) => r.date === date);

  if (index === -1) {
    return { ok: false, error: 'not_found', message: 'Check-in not found.' };
  }

  const removed = records[index];
  records.splice(index, 1);
  await writeCheckins(records);

  return { ok: true, record: removed };
}

module.exports = {
  TIMEZONE,
  getHoChiMinhDateString,
  getHoChiMinhTimeString,
  ensureDataFile,
  readCheckins,
  writeCheckins,
  getTodayCheckin,
  addCheckin,
  listCheckins,
  getStatus,
  deleteCheckin,
};
