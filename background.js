// ── KidGuard v1.1 — background.js ────────────────────────────────────────────
// Tracks YouTube screen time, resets daily at midnight, fires alarm for limits.

const STORAGE_KEY_USAGE  = "kg_usage";   // { date: "YYYY-MM-DD", seconds: N }
const STORAGE_KEY_LIMIT  = "kg_limit";   // daily limit in minutes (0 = disabled)
const ALARM_RESET        = "kg_midnight_reset";
const ALARM_TICK         = "kg_tick";    // every minute, increment usage if YT tab active

// ── Setup alarms on install / startup ─────────────────────────────────────────
chrome.runtime.onInstalled.addListener(setupAlarms);
chrome.runtime.onStartup.addListener(setupAlarms);

function setupAlarms() {
  chrome.alarms.create(ALARM_TICK, { periodInMinutes: 1 });

  // Schedule midnight reset
  const now  = new Date();
  const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5).getTime() - now.getTime();
  chrome.alarms.create(ALARM_RESET, {
    delayInMinutes: msToMidnight / 60000,
    periodInMinutes: 24 * 60
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function getUsage() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEY_USAGE], r => {
      const u = r[STORAGE_KEY_USAGE];
      if (u && u.date === todayStr()) resolve(u.seconds || 0);
      else resolve(0);
    });
  });
}

async function setUsage(seconds) {
  await chrome.storage.local.set({ [STORAGE_KEY_USAGE]: { date: todayStr(), seconds } });
}

async function getLimit() {
  return new Promise(resolve => {
    chrome.storage.sync.get([STORAGE_KEY_LIMIT], r => resolve(r[STORAGE_KEY_LIMIT] || 0));
  });
}

// ── Check if any YouTube tab is active & focused ──────────────────────────────
async function isYouTubeActive() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
      const tab = tabs[0];
      resolve(tab && tab.url && tab.url.includes("youtube.com"));
    });
  });
}

// ── Tick: increment usage if YouTube is active ────────────────────────────────
async function tick() {
  const active = await isYouTubeActive();
  if (!active) return;

  const usage = await getUsage();
  const newUsage = usage + 60; // add 60 seconds per tick
  await setUsage(newUsage);

  const limitMins = await getLimit();
  if (limitMins > 0 && newUsage >= limitMins * 60) {
    // Notify all YouTube tabs to show time-limit block
    chrome.tabs.query({ url: "*://*.youtube.com/*" }, tabs => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: "KG_TIME_LIMIT_REACHED" }).catch(() => {});
      });
    });
  }
}

// ── Alarm handler ─────────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_TICK)  await tick();
  if (alarm.name === ALARM_RESET) await setUsage(0);
});

// ── Message handler: popup asks for current usage ─────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "KG_GET_USAGE") {
    getUsage().then(s => sendResponse({ seconds: s }));
    return true; // keep channel open for async
  }
  if (msg.type === "KG_RESET_USAGE") {
    setUsage(0).then(() => sendResponse({ ok: true }));
    return true;
  }
});
