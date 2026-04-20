// ===============================
// プラン定義（分単位）
// ===============================
const PLANS = [
  { name: "通常（60分）", duration: 60 },
  { name: "ロング（90分）", duration: 90 },
  { name: "スペシャル（120分）", duration: 120 }
];

// ===============================
// 状態管理
// ===============================
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let currentType = "online";

let slotCache = { online: null, offline: null };
let lastFetchTime = { online: 0, offline: 0 };
const CACHE_TTL = 5 * 60 * 1000;

// ===============================
// デバウンス
// ===============================
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
const debouncedRender = debounce(renderMonthCalendar, 300);

// ===============================
// LIFF 初期化
// ===============================
window.onload = async () => {
  await liff.init({ liffId: APP_CONFIG.LIFF_ID });

  if (!liff.isLoggedIn()) {
    liff.login();
    return;
  }

  renderMonthCalendar();
};

// ===============================
// タブ切り替え
// ===============================
document.getElementById("tab-online").onclick = () => {
  currentType = "online";
  debouncedRender();
};
document.getElementById("tab-offline").onclick = () => {
  currentType = "offline";
  debouncedRender();
};

// ===============================
// 予約枠取得（キャッシュ付き）
// ===============================
async function getSlots() {
  const now = Date.now();

  if (slotCache[currentType] && now - lastFetchTime[currentType] < CACHE_TTL) {
    return slotCache[currentType];
  }

  const res = await fetch(APP_CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getSlots" })
  });

  const data = await res.json();
  slotCache[currentType] = data;
  lastFetchTime[currentType] = now;

  return data;
}

// ===============================
// 月間カレンダー
// ===============================
async function renderMonthCalendar() {
  const slots = await getSlots();
  const slotDates = slots.map(s => s.start.dateTime.split("T")[0]);

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  document.getElementById("calendar-title").textContent =
    `${currentYear}年 ${currentMonth + 1}月`;

  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";

  for (let i = 0; i < startWeekday; i++) grid.innerHTML += `<div></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const today = new Date().toISOString().split("T")[0];
    const hasSlot = slotDates.includes(dateStr) && dateStr >= today;

    grid.innerHTML += `
      <div class="calendar-cell ${hasSlot ? "has-slot" : ""}"
           onclick="selectDate('${dateStr}')">
        ${day}
      </div>
    `;
  }
}

// ===============================
// 日付選択 → 枠一覧
// ===============================
async function selectDate(dateStr) {
  const slots = await getSlots();
  const filtered = slots.filter(s => s.start.dateTime.startsWith(dateStr));

  document.getElementById("slot-title").textContent = `${dateStr} の空き枠`;

  const container = document.getElementById("slots");
  container.innerHTML = "";

  filtered.forEach(s => {
    const title = s.summary;

    container.innerHTML += `
      <div class="slot-row">
        <span>${title}</span>
        <button class="slot-btn" onclick="openConfirm('${title}', '${dateStr}')">予約</button>
      </div>
    `;
  });
}

// ===============================
// 枠選択 → プラン選択
// ===============================
function openConfirm(title, dateStr) {
  document.getElementById("confirm-modal").style.display = "block";

  document.getElementById("confirm-text").innerHTML = `
    <strong>${dateStr}</strong><br>
    枠：${title}<br><br>
    プランを選択してください：
  `;

  const container = document.getElementById("confirm-options");
  container.innerHTML = "";

  PLANS.forEach(plan => {
    const btn = document.createElement("button");
    btn.className = "plan-btn";
    btn.textContent = plan.name;

    btn.onclick = () => openTimeSelect(title, dateStr, plan.duration);

    container.appendChild(btn);
  });

  document.getElementById("confirm-cancel").onclick = () => {
    document.getElementById("confirm-modal").style.display = "none";
  };
}

// ===============================
// プラン選択 → 時間帯生成
// ===============================
function openTimeSelect(title, dateStr, duration) {
  const [place, timeRange] = title.split("｜");
  const [startStr, endStr] = timeRange.split("-");

  const frameStart = new Date(`${dateStr}T${startStr}:00`);
  const frameEnd = new Date(`${dateStr}T${endStr}:00`);

  const options = [];
  let t = new Date(frameStart);

  while (t.getTime() + duration * 60000 <= frameEnd.getTime()) {
    const start = new Date(t);
    const end = new Date(t.getTime() + duration * 60000);

    options.push({
      start: start.toISOString(),
      end: end.toISOString(),
      label: `${formatTime(start)}〜${formatTime(end)}`
    });

    t = new Date(t.getTime() + 30 * 60000);
  }

  document.getElementById("confirm-text").innerHTML = `
    <strong>${dateStr}</strong><br>
    プラン：${duration}分<br><br>
    時間帯を選択してください：
  `;

  const container = document.getElementById("confirm-options");
  container.innerHTML = "";

  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "time-btn";
    btn.textContent = opt.label;

    btn.onclick = () => reserve(opt.start, opt.end);

    container.appendChild(btn);
  });
}

function formatTime(d) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ===============================
// 予約確定
// ===============================
async function reserve(start, end) {
  const profile = await liff.getProfile();

  const res = await fetch(APP_CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "reserve",
      userId: profile.userId,
      displayName: profile.displayName,
      start,
      end
    })
  });

  const data = await res.json();

  if (data.status === "success") {
    alert("予約が完了しました！");
    slotCache.online = null;
    slotCache.offline = null;
  } else if (data.message === "already_reserved") {
    alert("その時間はすでに予約されています");
  } else {
    alert("予約に失敗しました");
  }

  document.getElementById("confirm-modal").style.display = "none";
  renderMonthCalendar();
}
