// ── Change PIN here ───────────────────────────────────────────────────────────
const SECRET_PIN = "1234";

const DEFAULT_KEYWORDS = [
  "roblox", "minecraft", "gaming", "fortnite", "maizen",
  "angelazz brookhaven", "angelazz", "sniper", "rivals",
  "peppa pig", "robux", "noobs", "sprunki"
];

let keywords = [...DEFAULT_KEYWORDS];

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

function renderKeywords() {
  keywordList.innerHTML = "";
  keywords.forEach((kw, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="kw-badge">
        <span class="kw-dot"></span>
        ${kw}
      </span>
      <button data-i="${i}" title="Remove">✕</button>
    `;
    keywordList.appendChild(li);
  });
  keywordList.querySelectorAll("button[data-i]").forEach((btn) => {
    btn.addEventListener("click", () => {
      keywords.splice(parseInt(btn.dataset.i), 1);
      saveAndRender();
    });
  });
}

function saveAndRender() {
  chrome.storage.sync.set({ blockedKeywords: keywords }, () => {
    statusEl.textContent = "✓ Saved";
    setTimeout(() => (statusEl.textContent = ""), 1800);
    renderKeywords();
  });
}

unlockBtn.addEventListener("click", () => {
  if (pinInput.value === SECRET_PIN) {
    errorEl.textContent = "";
    authSection.style.display = "none";
    mainSection.style.display = "flex";
    chrome.storage.sync.get(["blockedKeywords"], (result) => {
      keywords = result.blockedKeywords?.length ? result.blockedKeywords : [...DEFAULT_KEYWORDS];
      renderKeywords();
    });
  } else {
    errorEl.textContent = "❌ Wrong PIN — try again";
    pinInput.value = "";
    pinInput.style.animation = "none";
    pinInput.offsetHeight;
    pinInput.style.animation = "shake 0.4s ease";
  }
});

pinInput.addEventListener("keydown", (e) => { if (e.key === "Enter") unlockBtn.click(); });

addBtn.addEventListener("click", () => {
  const val = newKeyword.value.trim().toLowerCase();
  if (!val) return;
  if (keywords.includes(val)) {
    statusEl.textContent = "Already in list";
    statusEl.style.color = "#ffcc00";
    setTimeout(() => { statusEl.textContent = ""; statusEl.style.color = "#00e676"; }, 1500);
    return;
  }
  keywords.push(val);
  newKeyword.value = "";
  saveAndRender();
});

newKeyword.addEventListener("keydown", (e) => { if (e.key === "Enter") addBtn.click(); });

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
