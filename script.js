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
if (req.body.action === "getSlots") {
  try {
    // オンライン・対面の両方のカレンダーから取得
    const onlineEvents = await calendar.events.list({
      calendarId: ONLINE_CALENDAR_ID,
      singleEvents: true,
      orderBy: "startTime"
    });

    const offlineEvents = await calendar.events.list({
      calendarId: OFFLINE_CALENDAR_ID,
      singleEvents: true,
      orderBy: "startTime"
    });

    const allEvents = [
      ...onlineEvents.data.items,
      ...offlineEvents.data.items
    ];

    // ★ 枠イベント（frames）と予約イベント（bookings）に分ける
    const frames = allEvents.filter(e => !e.summary.startsWith("予約"));
    const bookings = allEvents.filter(e => e.summary.startsWith("予約"));

    return res.json({
      frames,
      bookings
    });

  } catch (e) {
    console.error(e);
    return res.json({ status: "error", message: "getSlots failed" });
  }
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
  const slotType = detectTypeFromTitle(title);

  document.getElementById("confirm-modal").style.display = "block";

  let typeText = "";
  if (slotType === "online") typeText = "（オンラインのみ）";
  if (slotType === "offline") typeText = "（対面のみ）";
  if (slotType === "both") typeText = "（オンライン / 対面 選択可）";

  document.getElementById("confirm-text").innerHTML = `
    <strong>${dateStr}</strong><br>
    枠：${title}<br>
    ${typeText}<br><br>
    プランを選択してください：
  `;

  const container = document.getElementById("confirm-options");
  container.innerHTML = "";

  PLANS.forEach(plan => {
    const btn = document.createElement("button");
    btn.className = "plan-btn";
    btn.textContent = plan.name;

    btn.onclick = () => openTimeSelect(title, dateStr, plan.duration, slotType);

    container.appendChild(btn);
  });

  document.getElementById("confirm-cancel").onclick = () => {
    document.getElementById("confirm-modal").style.display = "none";
  };
}

// ===============================
// プラン選択 → 時間帯生成
// ===============================
function openTimeSelect(title, dateStr, duration, slotType) {
  const [place, timeRange] = title.split("｜");
  const [startStr, endStr] = timeRange.split("-");

  const frameStart = new Date(`${dateStr}T${startStr}:00`);
  const frameEnd = new Date(`${dateStr}T${endStr}:00`);

  // ★ 予約イベントを取得
const bookings = window.currentBookings
  .filter(b => b.start.dateTime.startsWith(dateStr))
  .map(b => ({
    start: new Date(b.start.dateTime),
    end: new Date(b.end.dateTime)
  }));


  // ★ 空き時間帯を生成
  const freeRanges = subtractBookings(
    { start: frameStart, end: frameEnd },
    bookings
  );

  const options = [];

  freeRanges.forEach(range => {
    let t = new Date(range.start);

    while (t.getTime() + duration * 60000 <= range.end.getTime()) {
      const start = new Date(t);
      const end = new Date(t.getTime() + duration * 60000);

      options.push({
        start: start.toISOString(),
        end: end.toISOString(),
        label: `${formatTime(start)}〜${formatTime(end)}`
      });

      t = new Date(t.getTime() + 30 * 60000);
    }
  });

  // UI 表示はそのまま
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

    btn.onclick = () => reserve(opt.start, opt.end, slotType);

    container.appendChild(btn);
  });
}

// ===============================
// 予約確定
// ===============================
async function reserve(start, end, slotType) {
  const profile = await liff.getProfile();

  // slotType が both の場合は currentType を使う
  const finalType = slotType === "both" ? currentType : slotType;

  const res = await fetch(APP_CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "reserve",
      userId: profile.userId,
      displayName: profile.displayName,
      start,
      end,
      type: finalType   // ← これが超重要！
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
