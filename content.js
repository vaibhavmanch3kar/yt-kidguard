// ── KidGuard v4 — content.js ─────────────────────────────────────────────────
// Strict mode: on keyword match →
//   1. Video paused + muted + src wiped immediately
//   2. Overlay shown
//   3. Auto-redirect to YouTube home after 5 seconds if no parent action

const DEFAULT_KEYWORDS = [
  "roblox", "minecraft", "gaming", "fortnite", "maizen",
  "angelazz brookhaven", "angelazz", "sniper", "rivals",
  "peppa pig", "robux", "noobs", "sprunki"
];

const OVERLAY_ID     = "kidguard-overlay";
const REDIRECT_DELAY = 5000; // ms before auto-redirect to home

let blockedKeywords  = [...DEFAULT_KEYWORDS];
let lastUrl          = "";
let watchCheckTimer  = null;
let redirectTimer    = null;

// ── Rotating messages ─────────────────────────────────────────────────────────
const BLOCKED_MESSAGES = [
  { emoji: "🎮", title: "Level Locked!",          body: "Ask a parent to unlock this quest and continue the adventure!" },
  { emoji: "🚫", title: "Treasure Chest Locked!", body: "This search needs a parent explorer to unlock it!" },
  { emoji: "😄", title: "Nice Try, Champ!",       body: "This one needs a parent-level password. Go find yours!" },
  { emoji: "🕵️", title: "Mission Denied!",        body: "You need a grown-up partner to authorise this search." },
  { emoji: "⚡", title: "Access Denied!",          body: "Parent approval required to continue the adventure." },
  { emoji: "🛑", title: "Boss Level Ahead!",       body: "Bring a parent to proceed — they have the secret key!" },
  { emoji: "🤖", title: "System Alert!",           body: "This search requires parent authorisation. Please locate a parent unit." },
  { emoji: "🔐", title: "Restricted Mode ON!",     body: "Please connect with a parent to continue exploring." },
  { emoji: "🧠", title: "Smart Filter Activated!", body: "Let's check this one with a parent first — great question!" },
  { emoji: "😊", title: "Explore Together!",       body: "This is something to discover with a parent. Go team!" },
  { emoji: "👍", title: "Good Question!",          body: "Let's check this one with a parent — they'll love helping!" },
  { emoji: "👨‍👩‍👦", title: "Teamwork Time!",        body: "Ask a parent and explore this together. You've got this!" },
];

function getNextMessage() {
  let idx = parseInt(sessionStorage.getItem("kg_msg_idx") || "0");
  const msg = BLOCKED_MESSAGES[idx % BLOCKED_MESSAGES.length];
  sessionStorage.setItem("kg_msg_idx", String((idx + 1) % BLOCKED_MESSAGES.length));
  return msg;
}

// ── Storage sync ──────────────────────────────────────────────────────────────
chrome.storage.sync.get(["blockedKeywords"], (result) => {
  if (result.blockedKeywords?.length) blockedKeywords = result.blockedKeywords;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.blockedKeywords) {
    blockedKeywords = changes.blockedKeywords.newValue;
    filterAllCards();
  }
});

// ── Keyword check ─────────────────────────────────────────────────────────────
function containsBlockedKeyword(text) {
  const lower = (text || "").toLowerCase();
  return blockedKeywords.find((kw) => lower.includes(kw.toLowerCase())) || null;
}

// ── VIDEO KILL — the core strict enforcement ──────────────────────────────────
function killVideo() {
  document.querySelectorAll("video").forEach((v) => {
    try {
      v.pause();
      v.muted = true;
      v.volume = 0;
      v.src = "";
      v.removeAttribute("src");
      v.load();
      v.querySelectorAll("source").forEach((s) => s.remove());
    } catch (_) {}
  });

  try {
    const playerEl = document.querySelector("#movie_player, ytd-player");
    if (playerEl && typeof playerEl.pauseVideo === "function") {
      playerEl.pauseVideo();
    }
  } catch (_) {}
}

// ── Overlay ───────────────────────────────────────────────────────────────────
function showBlockOverlay() {
  if (document.getElementById(OVERLAY_ID)) return;
  const msg = getNextMessage();

  let secondsLeft = Math.round(REDIRECT_DELAY / 1000);
  if (redirectTimer) clearTimeout(redirectTimer);
  redirectTimer = setTimeout(() => {
    window.location.href = "https://www.youtube.com";
  }, REDIRECT_DELAY);

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    z-index: 2147483647; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-family: 'Segoe UI', Roboto, Arial, sans-serif;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    overflow: hidden;
  `;

  overlay.innerHTML = `
    <div id="kg-stars" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;"></div>

    <div style="
      position: relative;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 24px;
      padding: 44px 48px;
      max-width: 480px;
      width: 88%;
      text-align: center;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 40px rgba(0,0,0,0.6);
    ">
      <div style="
        font-size: 72px; line-height: 1; margin-bottom: 18px;
        animation: kg-bounce 1.4s ease-in-out infinite; display: inline-block;
      ">${msg.emoji}</div>

      <h1 style="
        font-size: 28px; font-weight: 800; color: #ffffff;
        margin: 0 0 12px; letter-spacing: -0.3px;
        text-shadow: 0 2px 12px rgba(0,100,255,0.4);
      ">${msg.title}</h1>

      <p style="
        font-size: 16px; color: rgba(255,255,255,0.72);
        margin: 0 0 20px; line-height: 1.6;
      ">${msg.body}</p>

      <div style="
        width: 100%; background: rgba(255,255,255,0.1);
        border-radius: 50px; height: 6px; margin-bottom: 12px; overflow: hidden;
      ">
        <div id="kg-progress" style="
          height: 100%;
          width: 100%;
          background: linear-gradient(90deg, #0a84ff, #00e5ff);
          border-radius: 50px;
          transition: width ${REDIRECT_DELAY}ms linear;
        "></div>
      </div>

      <p id="kg-countdown" style="
        font-size: 13px; color: rgba(255,255,255,0.45);
        margin: 0 0 24px;
      ">Returning to home in <strong style="color:#0a84ff">${secondsLeft}s</strong>...</p>

      <div id="kg-dots" style="display:flex;justify-content:center;gap:6px;margin-bottom:28px;"></div>

      <button id="kidguard-back" style="
        display: inline-block; padding: 14px 36px;
        background: linear-gradient(90deg, #065fd4, #0a84ff);
        color: white; border: none; border-radius: 50px;
        font-size: 16px; font-weight: 700; cursor: pointer;
        box-shadow: 0 4px 20px rgba(6,95,212,0.5);
        transition: transform 0.15s, box-shadow 0.15s;
        letter-spacing: 0.2px; margin-bottom: 12px; width: 100%;
      ">🏠 Go Back to Home Now</button>
    </div>

    <style>
      @keyframes kg-bounce {
        0%, 100% { transform: translateY(0); }
        50%       { transform: translateY(-10px); }
      }
      @keyframes kg-float {
        0%   { transform: translateY(0) rotate(0deg); opacity: 0.7; }
        100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
      }
      #kidguard-back:hover {
        transform: scale(1.03);
        box-shadow: 0 6px 28px rgba(6,95,212,0.7);
      }
    </style>
  `;

  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    const bar = overlay.querySelector("#kg-progress");
    if (bar) {
      requestAnimationFrame(() => { bar.style.width = "0%"; });
    }
  });

  const countdownEl = overlay.querySelector("#kg-countdown");
  const countdownInterval = setInterval(() => {
    secondsLeft = Math.max(0, secondsLeft - 1);
    if (countdownEl) {
      countdownEl.innerHTML = `Returning to home in <strong style="color:#0a84ff">${secondsLeft}s</strong>...`;
    }
    if (secondsLeft === 0) clearInterval(countdownInterval);
  }, 1000);

  const dotsEl = overlay.querySelector("#kg-dots");
  const currentIdx = ((parseInt(sessionStorage.getItem("kg_msg_idx") || "1") - 1 + BLOCKED_MESSAGES.length) % BLOCKED_MESSAGES.length);
  BLOCKED_MESSAGES.forEach((_, i) => {
    const dot = document.createElement("div");
    dot.style.cssText = `
      width: ${i === currentIdx ? "20px" : "8px"}; height: 8px; border-radius: 50px;
      background: ${i === currentIdx ? "#0a84ff" : "rgba(255,255,255,0.25)"}; transition: all 0.3s;
    `;
    dotsEl.appendChild(dot);
  });

  const starsEl = overlay.querySelector("#kg-stars");
  const starEmojis = ["⭐", "✨", "🌟", "💫"];
  for (let i = 0; i < 14; i++) {
    const star = document.createElement("div");
    star.style.cssText = `
      position: absolute; font-size: ${14 + Math.random() * 18}px;
      left: ${Math.random() * 100}%; bottom: -40px;
      animation: kg-float ${5 + Math.random() * 6}s ${Math.random() * 5}s linear infinite;
      pointer-events: none;
    `;
    star.textContent = starEmojis[Math.floor(Math.random() * starEmojis.length)];
    starsEl.appendChild(star);
  }

  overlay.querySelector("#kidguard-back").addEventListener("click", () => {
    clearTimeout(redirectTimer);
    clearInterval(countdownInterval);
    window.location.href = "https://www.youtube.com";
  });
}

function removeBlockOverlay() {
  document.getElementById(OVERLAY_ID)?.remove();
  if (redirectTimer) { clearTimeout(redirectTimer); redirectTimer = null; }
}

// ── Block trigger ─────────────────────────────────────────────────────────────
function triggerBlock() {
  killVideo();
  showBlockOverlay();
}

// ── Card filtering ────────────────────────────────────────────────────────────
function filterAllCards() {
  const selectors = [
    "ytd-rich-item-renderer",
    "ytd-video-renderer",
    "ytd-grid-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-shelf-renderer",
    "ytd-reel-item-renderer",
    "ytd-rich-shelf-renderer",
  ].join(", ");

  document.querySelectorAll(selectors).forEach((card) => {
    const titleEl =
      card.querySelector("#video-title, #title, .title") ||
      card.querySelector("yt-formatted-string[aria-label]");

    const titleText = titleEl?.textContent || titleEl?.getAttribute("aria-label") || "";
    const isBlocked = !!containsBlockedKeyword(titleText);

    if (isBlocked) {
      card.style.setProperty("display", "none", "important");
      card.dataset.kgBlocked = "1";
    } else if (card.dataset.kgBlocked) {
      card.style.removeProperty("display");
      delete card.dataset.kgBlocked;
    }
  });
}

function scheduleCardFilter() {
  filterAllCards();
  [300, 800, 1600, 3200, 6000].forEach((d) => setTimeout(filterAllCards, d));
}

// ── Watch page ────────────────────────────────────────────────────────────────
function checkWatchPage() {
  if (watchCheckTimer) clearTimeout(watchCheckTimer);
  let attempts = 0;
  const MAX_ATTEMPTS = 25;

  const TITLE_SELECTORS = [
    "h1.ytd-watch-metadata yt-formatted-string",
    "ytd-watch-metadata h1 yt-formatted-string",
    "#above-the-fold h1 yt-formatted-string",
    "#title h1 yt-formatted-string",
    "#title h1",
    "h1.title",
  ];

  function tryGetTitle() {
    let titleText = "";
    for (const sel of TITLE_SELECTORS) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) { titleText = el.textContent.trim(); break; }
    }
    if (!titleText) {
      const docTitle = document.title.replace(/\s*[-|]\s*YouTube\s*$/, "").trim();
      if (docTitle && docTitle !== "YouTube") titleText = docTitle;
    }

    if (!titleText && attempts < MAX_ATTEMPTS) {
      attempts++;
      watchCheckTimer = setTimeout(tryGetTitle, 250);
      return;
    }

    if (containsBlockedKeyword(titleText)) {
      triggerBlock();
    }
  }

  tryGetTitle();
}

// ── Search check ──────────────────────────────────────────────────────────────
function isBlockedSearch(url) {
  const query = new URLSearchParams(new URL(url).search).get("search_query") || "";
  return !!containsBlockedKeyword(query);
}

// ── Page router ───────────────────────────────────────────────────────────────
function checkPage() {
  const currentUrl = window.location.href;
  if (currentUrl === lastUrl) return;
  lastUrl = currentUrl;

  removeBlockOverlay();
  if (watchCheckTimer) { clearTimeout(watchCheckTimer); watchCheckTimer = null; }

  if (currentUrl.includes("youtube.com/results")) {
    if (isBlockedSearch(currentUrl)) triggerBlock();
    scheduleCardFilter();
  } else if (currentUrl.includes("youtube.com/watch")) {
    checkWatchPage();
    scheduleCardFilter();
  } else {
    scheduleCardFilter();
  }
}

// ── Video insert observer ─────────────────────────────────────────────────────
const videoInsertObserver = new MutationObserver((mutations) => {
  if (!document.getElementById(OVERLAY_ID)) return;
  mutations.forEach((m) => {
    m.addedNodes.forEach((node) => {
      if (node.nodeName === "VIDEO") {
        node.pause();
        node.muted = true;
        node.volume = 0;
      }
    });
  });
});

videoInsertObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

// ── Main MutationObserver ─────────────────────────────────────────────────────
let mutationThrottle = null;

const observer = new MutationObserver(() => {
  if (mutationThrottle) return;
  mutationThrottle = setTimeout(() => {
    mutationThrottle = null;
    checkPage();
    filterAllCards();
  }, 200);
});

observer.observe(document.documentElement, { childList: true, subtree: true });

// ── Bootstrap ─────────────────────────────────────────────────────────────────
checkPage();
