// UI ELEMENTS
const calcBtn = document.getElementById('calcBtn');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

let currentTabId = null;

// --- 1. THEME HANDLING ---
const savedTheme = localStorage.getItem('fnw_theme');
if (savedTheme === 'dark') {
  enableDarkMode();
}

themeToggle.addEventListener('click', () => {
  if (body.classList.contains('dark-mode')) {
    disableDarkMode();
  } else {
    enableDarkMode();
  }
});

function enableDarkMode() {
  body.classList.add('dark-mode');
  themeToggle.innerText = '🌙'; 
  localStorage.setItem('fnw_theme', 'dark');
}

function disableDarkMode() {
  body.classList.remove('dark-mode');
  themeToggle.innerText = '☀'; 
  localStorage.setItem('fnw_theme', 'light');
}

// --- 2. INITIALIZATION & LIVE LISTENER ---
document.addEventListener('DOMContentLoaded', async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab.id;
  
  // A. Check current state immediately
  checkState();

  // B. Listen for updates (Real-time sync)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[`stats_${currentTabId}`]) {
      const newData = changes[`stats_${currentTabId}`].newValue;
      handleStateUpdate(newData);
    }
  });
});

function checkState() {
  const key = `stats_${currentTabId}`;
  chrome.storage.local.get([key], (result) => {
    if (result[key]) {
      handleStateUpdate(result[key]);
    }
  });
}

function handleStateUpdate(data) {
  if (data.status === 'scanning') {
    setLoadingUI();
  } else if (data.status === 'complete') {
    setCompleteUI(data.html);
  }
}

// --- 3. UI STATE HELPERS ---
function setLoadingUI() {
  calcBtn.innerText = "ANALYZING...";
  calcBtn.disabled = true;
  calcBtn.style.opacity = "0.7";
  statusEl.innerText = "Analysis running in background...";
}

function setCompleteUI(html) {
  calcBtn.innerText = "REFRESH ANALYSIS";
  calcBtn.disabled = false;
  calcBtn.style.opacity = "1";
  statusEl.innerText = "";
  // Safe to inject here because html was sanitized in the content script
  resultEl.innerHTML = html;
}

// --- 4. START ANALYSIS ---
calcBtn.addEventListener("click", () => {
  setLoadingUI();
  
  chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    function: runScraper,
    args: [currentTabId]
  });
});


// --- 5. CONTENT SCRIPT (Runs in Background of Tab) ---
async function runScraper(tabId) {
  const storageKey = `stats_${tabId}`;
  
  // SECURITY: Prevent XSS by escaping special characters
  const escapeHtml = (unsafe) => {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const saveState = (status, html = null) => {
    chrome.storage.local.set({ 
      [storageKey]: { status: status, html: html, timestamp: Date.now() } 
    });
  };

  saveState('scanning');

  const wait = (ms) => new Promise(res => setTimeout(res, ms));

  // --- SCROLL PHASE ---
  let attempts = 0;
  let maxAttempts = 300; 
  let lastHeight = document.body.scrollHeight;
  let sameHeightCount = 0;

  while (attempts < maxAttempts) {
    window.scrollTo(0, document.body.scrollHeight);
    
    const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const loadMore = buttons.find(b => {
        const t = b.innerText.toLowerCase();
        return t.includes('show more') || t.includes('view more');
    });
    if (loadMore) {
        loadMore.click();
        sameHeightCount = 0;
    }

    let hasChanged = false;
    for (let i = 0; i < 20; i++) {
        await wait(100); 
        let currentHeight = document.body.scrollHeight;
        if (currentHeight !== lastHeight) {
            hasChanged = true;
            lastHeight = currentHeight;
            sameHeightCount = 0;
            break; 
        }
    }

    if (!hasChanged) {
        sameHeightCount++;
        if (sameHeightCount >= 3) break; 
    }
    attempts++;
  }

  // --- PARSE PHASE ---
  const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const dateHeaderRegex = /^(?:Today|Yesterday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)?[\s,]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:,\s+\d{4})?/i;
  const priceRegex = /(?:CA\$|US\$|\$)([\d\.]+)/i;
  const refundRegex = /(Refund|Canceled|Cancelled)/i;

  let totalSpend = 0.0;
  let count = 0;
  let restaurantStats = {}; 
  let maxOrder = { store: "", amount: 0, date: "" };
  let currentDate = "Unknown Date";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (dateHeaderRegex.test(line) && line.length < 35) {
        currentDate = line;
        continue;
    }

    const priceMatch = line.match(priceRegex);
    if (priceMatch) {
        let isInvalid = false;
        if (refundRegex.test(line)) isInvalid = true;
        if (lines[i+1] && refundRegex.test(lines[i+1])) isInvalid = true;
        if (lines[i+2] && refundRegex.test(lines[i+2])) isInvalid = true;

        if (!isInvalid) {
            const amount = parseFloat(priceMatch[1]);
            
            let storeName = "Unknown Store";
            let k = i - 1;
            while (k >= 0) {
                const prevLine = lines[k];
                if (!dateHeaderRegex.test(prevLine) && prevLine !== "Completed" && prevLine.length > 2) {
                    storeName = prevLine;
                    break;
                }
                k--;
            }
            if (dateHeaderRegex.test(storeName)) storeName = "Unknown Store"; 

            if (amount > 0) {
                totalSpend += amount;
                count++;
                if (!restaurantStats[storeName]) restaurantStats[storeName] = 0;
                restaurantStats[storeName] += amount;
                if (amount > maxOrder.amount) maxOrder = { store: storeName, amount: amount, date: currentDate };
            }
        }
    }
  }

  // --- HTML GENERATION (With Security Sanitization) ---
  const sortedStores = Object.entries(restaurantStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  let html = `<div class="stat-card center-col">`;
  html += `<div class="total-amount">$${totalSpend.toFixed(2)}</div>`;
  html += `<div class="total-pill">${count} ORDERS TOTAL</div>`;
  html += `</div>`;

  html += `<div class="stat-card">`;
  html += `<div class="section-label">Top Cravings</div>`;
  sortedStores.forEach((s, idx) => {
    html += `<div class="list-row">
               <span class="store-name">${idx+1}. ${escapeHtml(s[0])}</span> 
               <span class="price-tag">$${s[1].toFixed(2)}</span>
             </div>`;
  });
  if (sortedStores.length === 0) html += `<div style="color:var(--text-sub); font-size:12px; text-align:center;">No orders found.</div>`;
  html += `</div>`;

  if (maxOrder.amount > 0) {
    html += `<div class="stat-card">`;
    html += `<div class="section-label">Biggest Splurge</div>`;
    html += `<div class="expensive-row">
               <span class="expensive-store">${escapeHtml(maxOrder.store)}</span>
               <span class="price-tag">$${maxOrder.amount.toFixed(2)}</span>
             </div>`;
    html += `<span class="expensive-date">${escapeHtml(maxOrder.date)}</span>`;
    html += `</div>`;
  }

  saveState('complete', html);
}