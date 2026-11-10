// ── KidGuard v1.1 — popup.js ─────────────────────────────────────────────────

const SECRET_PIN = "1234";

const DEFAULT_KEYWORDS = [
  "roblox", "minecraft", "gaming", "fortnite", "maizen",
  "angelazz brookhaven", "angelazz", "sniper", "rivals",
  "peppa pig", "robux", "noobs", "sprunki"
];

const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

let keywords = [...DEFAULT_KEYWORDS];
let scheduleWindows = []; // [{ days:[0-6], startHH, startMM, endHH, endMM }]

// ── Elements ──────────────────────────────────────────────────────────────────
const pinInput    = document.getElementById("pin-input");
const unlockBtn   = document.getElementById("unlock-btn");
const authSection = document.getElementById("auth-section");
const mainSection = document.getElementById("main-section");
const keywordList = document.getElementById("keyword-list");
const newKeyword  = document.getElementById("new-keyword");
const addBtn      = document.getElementById("add-btn");
const statusEl    = document.getElementById("status");
const errorEl     = document.getElementById("error");
const lockBtn     = document.getElementById("lock-btn");

// ── Tabs ──────────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    if (btn.dataset.tab === "time") refreshUsageDisplay();
  });
});

// ── Auth ──────────────────────────────────────────────────────────────────────
unlockBtn.addEventListener("click", () => {
  if (pinInput.value === SECRET_PIN) {
    errorEl.textContent = "";
    authSection.style.display = "none";
    mainSection.style.display = "flex";
    loadAll();
  } else {
    errorEl.textContent = "❌ Wrong PIN — try again";
    pinInput.value = "";
    pinInput.style.animation = "none";
    pinInput.offsetHeight;
    pinInput.style.animation = "shake 0.4s ease";
  }
});
pinInput.addEventListener("keydown", e => { if (e.key === "Enter") unlockBtn.click(); });

lockBtn.addEventListener("click", () => {
  mainSection.style.display = "none";
  authSection.style.display = "flex";
  pinInput.value = "";
  errorEl.textContent = "";
});

const style = document.createElement("style");
style.textContent = `
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%      { transform: translateX(-6px); }
    40%      { transform: translateX(6px); }
    60%      { transform: translateX(-4px); }
    80%      { transform: translateX(4px); }
  }
`;
document.head.appendChild(style);

// ── Load everything from storage ──────────────────────────────────────────────
function loadAll() {
  chrome.storage.sync.get(["blockedKeywords", "kg_schedule", "kg_limit"], result => {
    keywords        = result.blockedKeywords?.length ? result.blockedKeywords : [...DEFAULT_KEYWORDS];
    scheduleWindows = result.kg_schedule || [];
    renderKeywords();
    renderWindows();
    // Load limit input
    document.getElementById("limit-input").value = result.kg_limit || 0;
  });
  refreshUsageDisplay();
}

// ── Keywords ──────────────────────────────────────────────────────────────────
function renderKeywords() {
  keywordList.innerHTML = "";
  keywords.forEach((kw, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="kw-badge"><span class="kw-dot"></span>${kw}</span>
      <button data-i="${i}" title="Remove">✕</button>
    `;
    keywordList.appendChild(li);
  });
  keywordList.querySelectorAll("button[data-i]").forEach(btn => {
    btn.addEventListener("click", () => {
      keywords.splice(parseInt(btn.dataset.i), 1);
      saveKeywords();
    });
  });
}

function saveKeywords() {
  chrome.storage.sync.set({ blockedKeywords: keywords }, () => {
    showStatus("✓ Saved");
    renderKeywords();
  });
}

addBtn.addEventListener("click", () => {
  const val = newKeyword.value.trim().toLowerCase();
  if (!val) return;
  if (keywords.includes(val)) { showStatus("Already in list", "#ffcc00"); return; }
  keywords.push(val);
  newKeyword.value = "";
  saveKeywords();
});
newKeyword.addEventListener("keydown", e => { if (e.key === "Enter") addBtn.click(); });

// ── Screen Time ───────────────────────────────────────────────────────────────
function refreshUsageDisplay() {
  chrome.runtime.sendMessage({ type: "KG_GET_USAGE" }, resp => {
    const secs    = resp?.seconds || 0;
    const mins    = Math.floor(secs / 60);
    const limitEl = document.getElementById("limit-input");
    const limitMins = parseInt(limitEl?.value) || 0;

    document.getElementById("usage-mins-display").textContent = mins;

    const ring = document.getElementById("usage-ring-fg");
    if (ring) {
      const pct = limitMins > 0 ? Math.min(1, mins / limitMins) : 0;
      const circ = 2 * Math.PI * 40;
      ring.style.strokeDashoffset = circ * (1 - pct);
      ring.style.stroke = pct >= 1 ? "#ff6b6b" : pct >= 0.75 ? "#ffcc00" : "#0a84ff";
    }

    const sub = document.getElementById("usage-subtext");
    if (sub) {
      sub.textContent = limitMins > 0
        ? `${mins} of ${limitMins} min used today`
        : "No daily limit set";
    }
  });
}

document.getElementById("save-limit-btn").addEventListener("click", () => {
  const val = parseInt(document.getElementById("limit-input").value) || 0;
  chrome.storage.sync.set({ kg_limit: val }, () => {
    showStatus(val > 0 ? `✓ Limit set to ${val} min/day` : "✓ Limit disabled");
    refreshUsageDisplay();
  });
});

document.getElementById("reset-usage-btn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "KG_RESET_USAGE" }, () => {
    showStatus("✓ Today's usage reset");
    refreshUsageDisplay();
  });
});

// ── Schedule ──────────────────────────────────────────────────────────────────
function renderWindows() {
  const list = document.getElementById("window-list");
  if (!scheduleWindows.length) {
    list.innerHTML = '<div class="no-windows">No blocked windows yet</div>';
    return;
  }
  list.innerHTML = "";
  scheduleWindows.forEach((w, i) => {
    const dayLabels = w.days.map(d => DAY_NAMES[d]).join(", ");
    const fmt = (h, m) => `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
    const div = document.createElement("div");
    div.className = "sched-window-item";
    div.innerHTML = `
      <div>
        <div class="sched-days">${dayLabels}</div>
        <div class="sched-time">${fmt(w.startHH, w.startMM)} – ${fmt(w.endHH, w.endMM)}</div>
      </div>
      <button data-i="${i}" title="Remove">✕</button>
    `;
    list.appendChild(div);
  });
  list.querySelectorAll("button[data-i]").forEach(btn => {
    btn.addEventListener("click", () => {
      scheduleWindows.splice(parseInt(btn.dataset.i), 1);
      saveSchedule();
    });
  });
}

function saveSchedule() {
  chrome.storage.sync.set({ kg_schedule: scheduleWindows }, () => {
    showStatus("✓ Schedule saved");
    renderWindows();
  });
}

document.getElementById("add-window-btn").addEventListener("click", () => {
  const selectedDays = [...document.querySelectorAll(".day-btn.on")].map(b => parseInt(b.dataset.day));
  if (!selectedDays.length) { showStatus("Pick at least one day", "#ffcc00"); return; }

  const startVal = document.getElementById("sched-start").value; // "HH:MM"
  const endVal   = document.getElementById("sched-end").value;
  if (!startVal || !endVal) { showStatus("Set start and end time", "#ffcc00"); return; }

  const [sH, sM] = startVal.split(":").map(Number);
  const [eH, eM] = endVal.split(":").map(Number);

  scheduleWindows.push({ days: selectedDays, startHH: sH, startMM: sM, endHH: eH, endMM: eM });
  saveSchedule();
});

// Day toggle buttons
document.getElementById("day-row").querySelectorAll(".day-btn").forEach(btn => {
  btn.addEventListener("click", () => btn.classList.toggle("on"));
});

// ── Utility ───────────────────────────────────────────────────────────────────
function showStatus(msg, color = "#00e676") {
  statusEl.textContent = msg;
  statusEl.style.color = color;
  setTimeout(() => { statusEl.textContent = ""; statusEl.style.color = "#00e676"; }, 2000);
}
